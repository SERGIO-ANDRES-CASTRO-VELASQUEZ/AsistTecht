using System.Security.Claims;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize(Policy = "Profesor")]
[Route("api/estudiantes")]
public class EstudiantesController : ControllerBase
{
    private readonly AppDb _db;

    public EstudiantesController(AppDb db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int? grupoId)
    {
        var id = ProfesorId();
        var query = _db.Estudiantes.Where(e =>
            e.Grupo != null && (e.Grupo.ProfesorId == id || e.Grupo.Materias.Any(v => v.Materia!.ProfesorId == id)));
        if (grupoId is not null)
            query = query.Where(e => e.GrupoId == grupoId);

        var lista = await query
            .OrderBy(e => e.Nombre)
            .Select(e => new
            {
                e.Id,
                e.Nombre,
                e.Documento,
                e.GrupoId,
                grupo = e.Grupo != null ? e.Grupo.Nombre : null,
                acudiente = e.Acudiente != null ? e.Acudiente.Nombre : null,
                activo = e.Activo,
                tieneFoto = e.Foto != null,
                tieneRostro = e.Rostros.Any(r => r.Pose == "frente"),
                carnet = !string.IsNullOrEmpty(e.QrToken)
            })
            .ToListAsync();
        return Ok(lista);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] EstudianteRequest body)
    {
        var nombre = (body.Nombre ?? "").Trim();
        var documento = (body.Documento ?? "").Trim();
        var password = (body.Password ?? "").Trim();

        if (nombre.Length == 0 || nombre.Length > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del estudiante." });
        if (!DocumentoValido(documento))
            return BadRequest(new { mensaje = "El documento debe tener entre 5 y 15 dígitos." });

        // Si no se proporcionó clave o se solicita dinámica, se genera automáticamente
        if (string.IsNullOrWhiteSpace(password))
        {
            password = PasswordPolicy.GenerarClaveDinamica();
        }
        else
        {
            var (valida, error) = PasswordPolicy.Validar(password);
            if (!valida)
                return BadRequest(new { mensaje = error });
        }

        if (await _db.Estudiantes.AnyAsync(e => e.Documento == documento))
            return BadRequest(new { mensaje = "Ese documento ya está registrado." });

        if (!await GrupoPropio(body.GrupoId))
            return BadRequest(new { mensaje = "Elige un grupo válido." });

        var estudiante = DbSeeder.Nuevo(ProfesorId(), body.GrupoId, nombre, documento, password);
        estudiante.DebeCambiarPassword = true; // Todo estudiante creado debe cambiar su clave dinámica en el primer acceso
        _db.Estudiantes.Add(estudiante);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            estudiante.Id,
            estudiante.Nombre,
            estudiante.Documento,
            estudiante.GrupoId,
            claveTemporal = password,
            debeCambiarPassword = true
        });
    }

    [HttpPost("{estudianteId:int}/clave-dinamica")]
    public async Task<IActionResult> ResetClaveDinamica(int estudianteId)
    {
        var estudiante = await _db.Estudiantes
            .FirstOrDefaultAsync(e => e.Id == estudianteId && e.ProfesorId == ProfesorId());
        if (estudiante is null)
            return NotFound(new { mensaje = "No se encontró el estudiante." });

        var nuevaClave = PasswordPolicy.GenerarClaveDinamica();
        estudiante.PasswordHash = BCrypt.Net.BCrypt.HashPassword(nuevaClave);
        estudiante.DebeCambiarPassword = true;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            mensaje = "Nueva clave dinámica generada con éxito.",
            claveTemporal = nuevaClave,
            estudianteId = estudiante.Id,
            estudianteNombre = estudiante.Nombre
        });
    }

    [HttpPut("{estudianteId:int}")]
    public async Task<IActionResult> Actualizar(int estudianteId, [FromBody] EstudianteUpdate body)
    {
        var estudiante = await _db.Estudiantes
            .FirstOrDefaultAsync(e => e.Id == estudianteId && e.ProfesorId == ProfesorId());
        if (estudiante is null)
            return NotFound(new { mensaje = "No se encontró el estudiante." });

        var nombre = (body.Nombre ?? "").Trim();
        if (nombre.Length == 0 || nombre.Length > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del estudiante." });
        if (!await GrupoPropio(body.GrupoId))
            return BadRequest(new { mensaje = "Elige un grupo válido." });

        estudiante.Nombre = nombre;
        estudiante.GrupoId = body.GrupoId;
        if (!string.IsNullOrWhiteSpace(body.Password))
        {
            var (valida, error) = PasswordPolicy.Validar(body.Password.Trim());
            if (!valida)
                return BadRequest(new { mensaje = error });
            estudiante.PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password.Trim());
            estudiante.DebeCambiarPassword = true;
        }

        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Estudiante actualizado con éxito." });
    }

    [AllowAnonymous]
    [HttpGet("{estudianteId:int}/foto")]
    public async Task<IActionResult> ObtenerFoto(int estudianteId)
    {
        var estudiante = await _db.Estudiantes.FindAsync(estudianteId);
        if (estudiante?.Foto is null || estudiante.Foto.Length == 0)
            return NotFound(new { mensaje = "Foto no disponible." });
        return File(estudiante.Foto, estudiante.FotoTipo ?? "image/jpeg");
    }

    [HttpPut("{estudianteId:int}/foto")]
    public async Task<IActionResult> GuardarFoto(int estudianteId, [FromBody] FotoRequest body)
    {
        var estudiante = await Visible(estudianteId);
        if (estudiante is null)
            return NotFound(new { mensaje = "No se encontró el estudiante." });
        try
        {
            var foto = RostroUtil.FotoDesdeBase64(body.Imagen);
            estudiante.Foto = foto;
            estudiante.FotoTipo = RostroUtil.TipoDe(foto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Foto guardada." });
    }

    [HttpPut("{estudianteId:int}/rostro")]
    public async Task<IActionResult> GuardarRostro(int estudianteId, [FromBody] RostroRequest body)
    {
        var estudiante = await Visible(estudianteId);
        if (estudiante is null)
            return NotFound(new { mensaje = "No se encontró el estudiante." });
        return await GuardarMuestras(estudiante, body.Muestras);
    }

    [HttpGet("{estudianteId:int}/carnet")]
    public async Task<IActionResult> Carnet(int estudianteId)
    {
        var estudiante = await _db.Estudiantes
            .Include(e => e.Grupo)
            .Include(e => e.Rostros)
            .FirstOrDefaultAsync(e => e.Id == estudianteId);
        if (estudiante is null || await Visible(estudianteId) is null)
            return NotFound(new { mensaje = "No se encontró el estudiante." });
        return File(CarnetDibujo.Pintar(estudiante), "image/png", $"carnet-{estudiante.Documento}.png");
    }

    private async Task<IActionResult> GuardarMuestras(Estudiante estudiante, List<MuestraRostro>? muestras)
    {
        var lista = muestras ?? [];
        if (lista.Count == 0)
            return BadRequest(new { mensaje = "No se recibieron muestras del rostro." });

        // Auto-completar poses faltantes usando la pose de frente o la primera disponible
        var muestrasValidas = new List<MuestraRostro>();
        var muestraBase = lista.FirstOrDefault(m => (m.Pose ?? "").Trim().ToLowerInvariant() == "frente") ?? lista.First();

        foreach (var poseEsperada in RostroUtil.Poses)
        {
            var existente = lista.FirstOrDefault(m => (m.Pose ?? "").Trim().ToLowerInvariant() == poseEsperada);
            muestrasValidas.Add(existente ?? new MuestraRostro(poseEsperada, muestraBase.Vector));
        }

        var anteriores = await _db.Rostros.Where(r => r.EstudianteId == estudiante.Id).ToListAsync();
        _db.Rostros.RemoveRange(anteriores);
        foreach (var muestra in muestrasValidas)
        {
            var pose = (muestra.Pose ?? "").Trim().ToLowerInvariant();
            if (!RostroUtil.PoseValida(pose)) pose = "frente";
            string vector;
            try
            {
                vector = RostroUtil.Guardar(muestra.Vector ?? []);
            }
            catch (ArgumentException)
            {
                return BadRequest(new { mensaje = "Una de las lecturas de la cara no es válida." });
            }
            _db.Rostros.Add(new Rostro { EstudianteId = estudiante.Id, Pose = pose, Vector = vector });
        }
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Rostro guardado exitosamente." });
    }

    private async Task<Estudiante?> Visible(int estudianteId)
    {
        var id = ProfesorId();
        return await _db.Estudiantes.FirstOrDefaultAsync(e =>
            e.Id == estudianteId && e.Grupo != null &&
            (e.Grupo.ProfesorId == id || e.Grupo.Materias.Any(v => v.Materia!.ProfesorId == id)));
    }

    private int ProfesorId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> GrupoPropio(int? grupoId)
    {
        if (grupoId is null) return false;
        return await _db.Grupos.AnyAsync(g => g.Id == grupoId && g.ProfesorId == ProfesorId());
    }

    private static bool DocumentoValido(string documento) =>
        documento.Length is >= 5 and <= 15 && documento.All(char.IsDigit);
}

public record EstudianteRequest(string? Nombre, string? Documento, string? Password, int? GrupoId);
public record EstudianteUpdate(string? Nombre, int? GrupoId, string? Password);
public record FotoRequest(string? Imagen);
public record MuestraRostro(string? Pose, float[]? Vector);
public record RostroRequest(List<MuestraRostro>? Muestras);
