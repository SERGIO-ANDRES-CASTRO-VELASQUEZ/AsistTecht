using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDb _db;

    public AdminController(AppDb db) => _db = db;

    [HttpGet("resumen")]
    public async Task<IActionResult> Resumen()
    {
        var totalProfesores = await _db.Profesores.CountAsync();
        var profesoresActivos = await _db.Profesores.CountAsync(p => p.Activo);
        var totalEstudiantes = await _db.Estudiantes.CountAsync();
        var estudiantesActivos = await _db.Estudiantes.CountAsync(e => e.Activo);
        var totalAcudientes = await _db.Acudientes.CountAsync();
        var acudientesActivos = await _db.Acudientes.CountAsync(a => a.Activo);
        var solicitudesPendientes = await _db.SolicitudesClave.CountAsync(s => s.Estado == "Pendiente");
        var totalGrupos = await _db.Grupos.CountAsync();
        var totalMaterias = await _db.Materias.CountAsync();

        return Ok(new
        {
            profesores = new { total = totalProfesores, activos = profesoresActivos, inactivos = totalProfesores - profesoresActivos },
            estudiantes = new { total = totalEstudiantes, activos = estudiantesActivos, inactivos = totalEstudiantes - estudiantesActivos },
            acudientes = new { total = totalAcudientes, activos = acudientesActivos, inactivos = totalAcudientes - acudientesActivos },
            solicitudesPendientes,
            totalGrupos,
            totalMaterias
        });
    }

    // =========================================================================
    // GESTIÓN DE SOLICITUDES DE RESTABLECIMIENTO DE CLAVE
    // =========================================================================
    [HttpGet("solicitudes-clave")]
    public async Task<IActionResult> ListarSolicitudes()
    {
        var lista = await _db.SolicitudesClave
            .OrderByDescending(s => s.CreadaEn)
            .Select(s => new
            {
                s.Id,
                s.Documento,
                s.Nombre,
                s.Rol,
                s.Mensaje,
                s.Estado,
                s.ClaveGenerada,
                creadaEn = s.CreadaEn.ToString("yyyy-MM-dd HH:mm"),
                atendidaEn = s.AtendidaEn != null ? s.AtendidaEn.Value.ToString("yyyy-MM-dd HH:mm") : null
            })
            .ToListAsync();
        return Ok(lista);
    }

    [HttpPost("solicitudes-clave/{id:int}/atender")]
    public async Task<IActionResult> AtenderSolicitud(int id)
    {
        var solicitud = await _db.SolicitudesClave.FindAsync(id);
        if (solicitud is null)
            return NotFound(new { mensaje = "No se encontró la solicitud." });

        var nuevaClave = PasswordPolicy.GenerarClaveDinamica();

        if (solicitud.Rol.Equals("Estudiante", StringComparison.OrdinalIgnoreCase))
        {
            var est = await _db.Estudiantes.FirstOrDefaultAsync(e => e.Documento == solicitud.Documento);
            if (est is not null)
            {
                est.PasswordHash = BCrypt.Net.BCrypt.HashPassword(nuevaClave);
                est.DebeCambiarPassword = true; // Solo la primera vez que entre con esta clave temporal la cambiará
            }
        }
        else if (solicitud.Rol.Equals("Profesor", StringComparison.OrdinalIgnoreCase))
        {
            var prof = await _db.Profesores.FirstOrDefaultAsync(p => p.Usuario == solicitud.Documento.ToLowerInvariant());
            if (prof is not null)
            {
                prof.PasswordHash = BCrypt.Net.BCrypt.HashPassword(nuevaClave);
            }
        }
        else if (solicitud.Rol.Equals("Acudiente", StringComparison.OrdinalIgnoreCase))
        {
            var acud = await _db.Acudientes.FirstOrDefaultAsync(a => a.Documento == solicitud.Documento);
            if (acud is not null)
            {
                acud.PasswordHash = BCrypt.Net.BCrypt.HashPassword(nuevaClave);
            }
        }

        solicitud.Estado = "Atendida";
        solicitud.ClaveGenerada = nuevaClave;
        solicitud.AtendidaEn = DateTime.UtcNow;

        _db.Notificaciones.Add(new Notificacion
        {
            RolDestinatario = solicitud.Rol,
            Titulo = "Tu contraseña ha sido restablecida",
            Mensaje = $"Tu solicitud fue atendida por el Administrador. Ingresa con tu clave provisional asignada.",
            Tipo = "Info",
            Link = "/ingreso"
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            mensaje = $"Solicitud atendida. Se generó la clave provisional para {solicitud.Nombre}.",
            claveGenerada = nuevaClave,
            solicitudId = solicitud.Id,
            solicitud.Documento,
            solicitud.Nombre
        });
    }

    // =========================================================================
    // GESTIÓN DE DOCENTES (PROFESORES)
    // =========================================================================
    [HttpGet("profesores")]
    public async Task<IActionResult> ListarProfesores()
    {
        var lista = await _db.Profesores
            .OrderBy(p => p.Nombre)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Usuario,
                p.Activo,
                materiasCount = p.Materias.Count,
                gruposCount = p.Grupos.Count
            })
            .ToListAsync();
        return Ok(lista);
    }

    [HttpPost("profesores")]
    public async Task<IActionResult> CrearProfesor([FromBody] AdminProfesorRequest body)
    {
        var nombre = (body.Nombre ?? "").Trim();
        var cedula = ((body.Documento ?? body.Usuario) ?? "").Trim().ToLowerInvariant();
        var password = (body.Password ?? "").Trim();

        if (nombre.Length is 0 or > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del profesor." });
        if (cedula.Length is < 4 or > 40 || cedula.Any(char.IsWhiteSpace))
            return BadRequest(new { mensaje = "La Cédula de Ciudadanía / Documento del docente debe tener entre 4 y 40 caracteres, sin espacios." });

        if (string.IsNullOrWhiteSpace(password))
            password = PasswordPolicy.GenerarClaveDinamica();
        else
        {
            var (valida, error) = PasswordPolicy.Validar(password);
            if (!valida) return BadRequest(new { mensaje = error });
        }

        if (await _db.Profesores.AnyAsync(p => p.Usuario == cedula))
            return BadRequest(new { mensaje = "Ya existe un docente registrado con esa Cédula de Ciudadanía." });

        var profesor = new Profesor
        {
            Nombre = nombre,
            Usuario = cedula,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Activo = true
        };
        _db.Profesores.Add(profesor);
        await _db.SaveChangesAsync();

        return Ok(new { profesor.Id, profesor.Nombre, profesor.Usuario, cedula = profesor.Usuario, claveAsignada = password, profesor.Activo });
    }

    [HttpPut("profesores/{id:int}/estado")]
    public async Task<IActionResult> CambiarEstadoProfesor(int id)
    {
        var prof = await _db.Profesores.FindAsync(id);
        if (prof is null) return NotFound(new { mensaje = "Docente no encontrado." });
        prof.Activo = !prof.Activo;
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = $"Docente {(prof.Activo ? "activado" : "desactivado")} exitosamente.", prof.Activo });
    }

    [HttpPost("profesores/{id:int}/clave-dinamica")]
    public async Task<IActionResult> ResetClaveProfesor(int id)
    {
        var prof = await _db.Profesores.FindAsync(id);
        if (prof is null) return NotFound(new { mensaje = "Docente no encontrado." });
        var clave = PasswordPolicy.GenerarClaveDinamica();
        prof.PasswordHash = BCrypt.Net.BCrypt.HashPassword(clave);
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Nueva clave provisional asignada.", claveGenerada = clave, prof.Nombre });
    }

    [HttpPut("profesores/{id:int}")]
    public async Task<IActionResult> ActualizarProfesor(int id, [FromBody] AdminProfesorUpdate body)
    {
        var prof = await _db.Profesores.FindAsync(id);
        if (prof is null) return NotFound(new { mensaje = "Docente no encontrado." });

        var nombre = (body.Nombre ?? "").Trim();
        var cedula = ((body.Documento ?? body.Usuario) ?? "").Trim().ToLowerInvariant();

        if (nombre.Length is 0 or > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del profesor." });
        if (cedula.Length is < 4 or > 40 || cedula.Any(char.IsWhiteSpace))
            return BadRequest(new { mensaje = "La Cédula de Ciudadanía / Documento del docente debe tener entre 4 y 40 caracteres, sin espacios." });

        if (await _db.Profesores.AnyAsync(p => p.Usuario == cedula && p.Id != id))
            return BadRequest(new { mensaje = "Esa Cédula de Ciudadanía ya está en uso por otro profesor." });

        prof.Nombre = nombre;
        prof.Usuario = cedula;

        if (!string.IsNullOrWhiteSpace(body.Password))
        {
            var (valida, error) = PasswordPolicy.Validar(body.Password.Trim());
            if (!valida) return BadRequest(new { mensaje = error });
            prof.PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password.Trim());
        }

        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Docente actualizado exitosamente.", prof.Id, prof.Nombre, prof.Usuario, cedula = prof.Usuario });
    }

    [HttpDelete("profesores/{id:int}")]
    public async Task<IActionResult> EliminarProfesor(int id)
    {
        var prof = await _db.Profesores.FindAsync(id);
        if (prof is null) return NotFound(new { mensaje = "Docente no encontrado." });

        var otroProfesor = await _db.Profesores.FirstOrDefaultAsync(p => p.Id != id);
        if (otroProfesor is null)
            return BadRequest(new { mensaje = "No se puede eliminar el único docente de la institución. Registra o designa otro docente primero." });

        // Reasignar grupos, materias y estudiantes al otro profesor para preservar la integridad relacional
        var grupos = await _db.Grupos.Where(g => g.ProfesorId == id).ToListAsync();
        foreach (var g in grupos) g.ProfesorId = otroProfesor.Id;

        var materias = await _db.Materias.Where(m => m.ProfesorId == id).ToListAsync();
        foreach (var m in materias) m.ProfesorId = otroProfesor.Id;

        var estudiantes = await _db.Estudiantes.Where(e => e.ProfesorId == id).ToListAsync();
        foreach (var e in estudiantes) e.ProfesorId = otroProfesor.Id;

        var sesiones = await _db.Sesiones.Where(s => s.ProfesorId == id).ToListAsync();
        foreach (var s in sesiones) s.ProfesorId = otroProfesor.Id;

        var observaciones = await _db.ObservacionesConvivencia.Where(o => o.ProfesorId == id).ToListAsync();
        foreach (var o in observaciones) o.ProfesorId = otroProfesor.Id;

        _db.Profesores.Remove(prof);
        await _db.SaveChangesAsync();

        return Ok(new { mensaje = $"Docente {prof.Nombre} eliminado del sistema. Sus asignaturas y grupos fueron reasignados preventivamente a {otroProfesor.Nombre}." });
    }

    // =========================================================================
    // GESTIÓN DE GRUPOS / GRADOS INSTITUCIONALES PARA ADMIN
    // =========================================================================
    [HttpGet("grupos")]
    public async Task<IActionResult> ListarGrupos()
    {
        var lista = await _db.Grupos
            .OrderBy(g => g.Nombre)
            .Select(g => new
            {
                g.Id,
                g.Nombre,
                estudiantesCount = g.Estudiantes.Count
            })
            .ToListAsync();
        return Ok(lista);
    }

    [HttpPost("grupos")]
    public async Task<IActionResult> CrearGrupo([FromBody] AdminGrupoRequest body)
    {
        var nombre = (body.Nombre ?? "").Trim();
        if (string.IsNullOrEmpty(nombre))
            return BadRequest(new { mensaje = "El nombre del grado o grupo es obligatorio." });

        if (await _db.Grupos.AnyAsync(g => g.Nombre.ToLower() == nombre.ToLower()))
            return BadRequest(new { mensaje = "Ya existe un grupo con ese nombre." });

        var primerProfesor = await _db.Profesores.FirstOrDefaultAsync();
        var grupo = new Grupo
        {
            Nombre = nombre,
            ProfesorId = primerProfesor?.Id ?? 1
        };
        _db.Grupos.Add(grupo);
        await _db.SaveChangesAsync();

        return Ok(new { grupo.Id, grupo.Nombre });
    }

    // =========================================================================
    // GESTIÓN DE ESTUDIANTES
    // =========================================================================
    [HttpGet("estudiantes")]
    public async Task<IActionResult> ListarEstudiantes([FromQuery] int? grupoId)
    {
        var query = _db.Estudiantes.AsQueryable();
        if (grupoId.HasValue && grupoId.Value > 0)
            query = query.Where(e => e.GrupoId == grupoId);

        var lista = await query
            .OrderBy(e => e.Nombre)
            .Select(e => new
            {
                e.Id,
                e.Nombre,
                e.Documento,
                e.GrupoId,
                grupo = e.Grupo != null ? e.Grupo.Nombre : "Sin grupo",
                e.AcudienteId,
                acudiente = e.Acudiente != null ? e.Acudiente.Nombre : null,
                acudienteDocumento = e.Acudiente != null ? e.Acudiente.Documento : null,
                e.Activo,
                e.MotivoInactivacion,
                e.DebeCambiarPassword,
                tieneFoto = e.Foto != null,
                tieneRostro = e.Rostros.Any(r => r.Pose == "frente"),
                carnet = !string.IsNullOrEmpty(e.QrToken)
            })
            .ToListAsync();
        return Ok(lista);
    }

    [HttpPost("estudiantes")]
    public async Task<IActionResult> CrearEstudiante([FromBody] AdminEstudianteRequest body)
    {
        var nombre = (body.Nombre ?? "").Trim();
        var documento = (body.Documento ?? "").Trim();
        var password = (body.Password ?? "").Trim();

        if (nombre.Length is 0 or > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del estudiante." });
        if (documento.Length is < 5 or > 20 || !documento.All(char.IsDigit))
            return BadRequest(new { mensaje = "El documento debe ser numérico entre 5 y 20 dígitos." });

        if (string.IsNullOrWhiteSpace(password))
            password = PasswordPolicy.GenerarClaveDinamica();
        else
        {
            var (valida, error) = PasswordPolicy.Validar(password);
            if (!valida) return BadRequest(new { mensaje = error });
        }

        if (await _db.Estudiantes.AnyAsync(e => e.Documento == documento))
            return BadRequest(new { mensaje = "Ese documento ya está registrado." });

        var profesor = await _db.Profesores.FirstOrDefaultAsync();
        var profId = profesor?.Id ?? 1;

        int? grupoId = body.GrupoId > 0 ? body.GrupoId : null;
        if (!grupoId.HasValue)
        {
            var primerGrupo = await _db.Grupos.FirstOrDefaultAsync();
            grupoId = primerGrupo?.Id;
        }

        var estudiante = DbSeeder.Nuevo(profId, grupoId, nombre, documento, password);
        estudiante.DebeCambiarPassword = true; // Solo la primera vez requerirá cambio
        estudiante.Activo = true;

        if (body.AcudienteId.HasValue && body.AcudienteId.Value > 0)
            estudiante.AcudienteId = body.AcudienteId.Value;

        _db.Estudiantes.Add(estudiante);
        await _db.SaveChangesAsync();

        var nombreGrupo = await _db.Grupos.Where(g => g.Id == estudiante.GrupoId).Select(g => g.Nombre).FirstOrDefaultAsync() ?? "Sin grupo";

        return Ok(new
        {
            estudiante.Id,
            estudiante.Nombre,
            estudiante.Documento,
            estudiante.GrupoId,
            grupo = nombreGrupo,
            estudiante.AcudienteId,
            claveTemporal = password,
            estudiante.Activo,
            estudiante.DebeCambiarPassword
        });
    }

    [HttpPut("estudiantes/{id:int}")]
    public async Task<IActionResult> ActualizarEstudiante(int id, [FromBody] AdminEstudianteUpdate body)
    {
        var est = await _db.Estudiantes.FindAsync(id);
        if (est is null) return NotFound(new { mensaje = "Estudiante no encontrado." });

        var nombre = (body.Nombre ?? "").Trim();
        if (nombre.Length is 0 or > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del estudiante." });

        if (!string.IsNullOrWhiteSpace(body.Documento))
        {
            var doc = body.Documento.Trim();
            if (doc.Length is < 5 or > 20 || !doc.All(char.IsDigit))
                return BadRequest(new { mensaje = "El documento debe ser numérico entre 5 y 20 dígitos." });

            if (await _db.Estudiantes.AnyAsync(e => e.Documento == doc && e.Id != id))
                return BadRequest(new { mensaje = "Ya existe otro estudiante registrado con ese documento." });

            est.Documento = doc;
        }

        est.Nombre = nombre;
        est.GrupoId = body.GrupoId > 0 ? body.GrupoId : null;
        est.AcudienteId = body.AcudienteId > 0 ? body.AcudienteId : null;

        if (!string.IsNullOrWhiteSpace(body.Password))
        {
            var (valida, error) = PasswordPolicy.Validar(body.Password.Trim());
            if (!valida) return BadRequest(new { mensaje = error });
            est.PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password.Trim());
            est.DebeCambiarPassword = false;
        }

        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Estudiante actualizado exitosamente.", est.Id, est.Nombre, est.Documento, est.GrupoId, est.AcudienteId });
    }

    [HttpDelete("estudiantes/{id:int}")]
    public async Task<IActionResult> EliminarEstudiante(int id)
    {
        var est = await _db.Estudiantes.FindAsync(id);
        if (est is null) return NotFound(new { mensaje = "Estudiante no encontrado." });

        // Limpiar registros relacionados para evitar violaciones de clave foránea
        var rostros = await _db.Rostros.Where(r => r.EstudianteId == id).ToListAsync();
        var asistencias = await _db.Asistencias.Where(a => a.EstudianteId == id).ToListAsync();
        var notas = await _db.Notas.Where(n => n.EstudianteId == id).ToListAsync();
        var observaciones = await _db.ObservacionesConvivencia.Where(o => o.EstudianteId == id).ToListAsync();
        var solicitudes = await _db.SolicitudesClave.Where(s => s.Documento == est.Documento).ToListAsync();

        _db.Rostros.RemoveRange(rostros);
        _db.Asistencias.RemoveRange(asistencias);
        _db.Notas.RemoveRange(notas);
        _db.ObservacionesConvivencia.RemoveRange(observaciones);
        _db.SolicitudesClave.RemoveRange(solicitudes);

        _db.Estudiantes.Remove(est);
        await _db.SaveChangesAsync();

        return Ok(new { mensaje = $"Estudiante {est.Nombre} (Doc. {est.Documento}) eliminado del sistema exitosamente." });
    }

    [HttpPut("estudiantes/{id:int}/estado")]
    public async Task<IActionResult> CambiarEstadoEstudiante(int id, [FromBody] EstadoEstudianteRequest? body = null)
    {
        var est = await _db.Estudiantes.FindAsync(id);
        if (est is null) return NotFound(new { mensaje = "Estudiante no encontrado." });

        if (body?.Activo.HasValue == true)
            est.Activo = body.Activo.Value;
        else
            est.Activo = !est.Activo;

        if (!est.Activo)
        {
            est.MotivoInactivacion = !string.IsNullOrWhiteSpace(body?.Motivo)
                ? body.Motivo.Trim()
                : "Inactivado por administración institucional.";
        }
        else
        {
            est.MotivoInactivacion = null;
        }

        await _db.SaveChangesAsync();

        var estadoTxt = est.Activo ? "activado" : "inactivado";
        var motivoTxt = !est.Activo ? $" Motivo: {est.MotivoInactivacion}" : "";
        return Ok(new
        {
            mensaje = $"Estudiante {est.Nombre} {estadoTxt} exitosamente.{motivoTxt}",
            est.Activo,
            est.MotivoInactivacion
        });
    }

    [HttpPost("estudiantes/{id:int}/clave-dinamica")]
    public async Task<IActionResult> ResetClaveEstudiante(int id)
    {
        var est = await _db.Estudiantes.FindAsync(id);
        if (est is null) return NotFound(new { mensaje = "Estudiante no encontrado." });
        var clave = PasswordPolicy.GenerarClaveDinamica();
        est.PasswordHash = BCrypt.Net.BCrypt.HashPassword(clave);
        est.DebeCambiarPassword = true;
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Nueva clave provisional asignada con éxito.", claveGenerada = clave, est.Nombre });
    }

    // =========================================================================
    // GESTIÓN DE ACUDIENTES (FAMILIAS) Y AMARRE A ESTUDIANTES
    // =========================================================================
    [HttpGet("acudientes")]
    public async Task<IActionResult> ListarAcudientes()
    {
        var lista = await _db.Acudientes
            .OrderBy(a => a.Nombre)
            .Select(a => new
            {
                a.Id,
                a.Nombre,
                a.Documento,
                a.Telefono,
                a.Correo,
                a.Activo,
                estudiantes = a.Estudiantes.Select(e => new
                {
                    e.Id,
                    e.Nombre,
                    e.Documento,
                    grupo = e.Grupo != null ? e.Grupo.Nombre : "Sin grupo",
                    e.Activo
                }).ToList()
            })
            .ToListAsync();
        return Ok(lista);
    }

    [HttpPost("acudientes")]
    public async Task<IActionResult> CrearAcudiente([FromBody] AdminAcudienteRequest body)
    {
        var nombre = (body.Nombre ?? "").Trim();
        var documento = (body.Documento ?? "").Trim();
        var password = (body.Password ?? "").Trim();

        if (nombre.Length is 0 or > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del acudiente." });
        if (documento.Length is < 5 or > 20 || !documento.All(char.IsDigit))
            return BadRequest(new { mensaje = "El documento debe ser numérico entre 5 y 20 dígitos." });

        if (string.IsNullOrWhiteSpace(password))
            password = PasswordPolicy.GenerarClaveDinamica();
        else
        {
            var (valida, error) = PasswordPolicy.Validar(password);
            if (!valida) return BadRequest(new { mensaje = error });
        }

        if (await _db.Acudientes.AnyAsync(a => a.Documento == documento))
            return BadRequest(new { mensaje = "Ese documento ya está registrado como acudiente." });

        var acudiente = new Acudiente
        {
            Nombre = nombre,
            Documento = documento,
            Telefono = (body.Telefono ?? "").Trim(),
            Correo = (body.Correo ?? "").Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Activo = true
        };
        _db.Acudientes.Add(acudiente);
        await _db.SaveChangesAsync();

        // Amarrar / vincular los estudiantes seleccionados a este acudiente
        if (body.EstudianteIds != null && body.EstudianteIds.Length > 0)
        {
            var hijos = await _db.Estudiantes.Where(e => body.EstudianteIds.Contains(e.Id)).ToListAsync();
            foreach (var h in hijos)
            {
                h.AcudienteId = acudiente.Id;
            }
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            acudiente.Id,
            acudiente.Nombre,
            acudiente.Documento,
            claveAsignada = password,
            acudiente.Activo,
            hijosVinculados = body.EstudianteIds?.Length ?? 0
        });
    }

    [HttpPut("acudientes/{id:int}")]
    public async Task<IActionResult> ActualizarAcudiente(int id, [FromBody] AdminAcudienteRequest body)
    {
        var acud = await _db.Acudientes.Include(a => a.Estudiantes).FirstOrDefaultAsync(a => a.Id == id);
        if (acud is null) return NotFound(new { mensaje = "Acudiente no encontrado." });

        var nombre = (body.Nombre ?? "").Trim();
        if (nombre.Length is 0 or > 120)
            return BadRequest(new { mensaje = "Escribe el nombre del acudiente." });

        if (!string.IsNullOrWhiteSpace(body.Documento))
        {
            var doc = body.Documento.Trim();
            if (doc.Length is < 5 or > 20 || !doc.All(char.IsDigit))
                return BadRequest(new { mensaje = "El documento debe ser numérico entre 5 y 20 dígitos." });

            if (await _db.Acudientes.AnyAsync(a => a.Documento == doc && a.Id != id))
                return BadRequest(new { mensaje = "Ya existe otro acudiente registrado con ese documento." });

            acud.Documento = doc;
        }

        acud.Nombre = nombre;
        acud.Telefono = (body.Telefono ?? "").Trim();
        acud.Correo = (body.Correo ?? "").Trim();

        if (!string.IsNullOrWhiteSpace(body.Password))
        {
            var (valida, error) = PasswordPolicy.Validar(body.Password.Trim());
            if (!valida) return BadRequest(new { mensaje = error });
            acud.PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password.Trim());
        }

        if (body.EstudianteIds != null)
        {
            // Desvincular anteriores no seleccionados
            var anteriores = await _db.Estudiantes.Where(e => e.AcudienteId == acud.Id).ToListAsync();
            foreach (var ant in anteriores)
            {
                if (!body.EstudianteIds.Contains(ant.Id))
                    ant.AcudienteId = null;
            }

            // Vincular nuevos
            var nuevos = await _db.Estudiantes.Where(e => body.EstudianteIds.Contains(e.Id)).ToListAsync();
            foreach (var n in nuevos)
            {
                n.AcudienteId = acud.Id;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Información del acudiente actualizada correctamente." });
    }

    [HttpDelete("acudientes/{id:int}")]
    public async Task<IActionResult> EliminarAcudiente(int id)
    {
        var acud = await _db.Acudientes.FindAsync(id);
        if (acud is null) return NotFound(new { mensaje = "Acudiente no encontrado." });

        // Desvincular a todos los hijos
        var hijos = await _db.Estudiantes.Where(e => e.AcudienteId == id).ToListAsync();
        foreach (var h in hijos)
        {
            h.AcudienteId = null;
        }

        var solicitudes = await _db.SolicitudesClave.Where(s => s.Documento == acud.Documento).ToListAsync();
        _db.SolicitudesClave.RemoveRange(solicitudes);

        _db.Acudientes.Remove(acud);
        await _db.SaveChangesAsync();

        return Ok(new { mensaje = $"Acudiente {acud.Nombre} eliminado del sistema. Sus {hijos.Count} hijo(s) fueron desvinculados de forma segura." });
    }

    [HttpPut("acudientes/{id:int}/estado")]
    public async Task<IActionResult> CambiarEstadoAcudiente(int id)
    {
        var acud = await _db.Acudientes.FindAsync(id);
        if (acud is null) return NotFound(new { mensaje = "Acudiente no encontrado." });
        acud.Activo = !acud.Activo;
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = $"Acudiente {(acud.Activo ? "activado" : "desactivado")} exitosamente.", acud.Activo });
    }

    [HttpPost("acudientes/{id:int}/clave-dinamica")]
    public async Task<IActionResult> ResetClaveAcudiente(int id)
    {
        var acud = await _db.Acudientes.FindAsync(id);
        if (acud is null) return NotFound(new { mensaje = "Acudiente no encontrado." });
        var clave = PasswordPolicy.GenerarClaveDinamica();
        acud.PasswordHash = BCrypt.Net.BCrypt.HashPassword(clave);
        await _db.SaveChangesAsync();
        return Ok(new { mensaje = "Nueva clave provisional asignada.", claveGenerada = clave, acud.Nombre });
    }

    [HttpPost("acudientes/{id:int}/vincular")]
    public async Task<IActionResult> VincularHijo(int id, [FromBody] VincularHijoRequest body)
    {
        var acudiente = await _db.Acudientes.FindAsync(id);
        if (acudiente is null) return NotFound(new { mensaje = "Acudiente no encontrado." });

        var estudiante = await _db.Estudiantes.FindAsync(body.EstudianteId);
        if (estudiante is null) return NotFound(new { mensaje = "Estudiante no encontrado." });

        estudiante.AcudienteId = acudiente.Id;
        await _db.SaveChangesAsync();

        return Ok(new { mensaje = $"Estudiante {estudiante.Nombre} amarrado correctamente al acudiente {acudiente.Nombre}." });
    }
}

public record AdminProfesorRequest(string? Nombre, string? Usuario, string? Documento, string? Password);
public record AdminProfesorUpdate(string? Nombre, string? Usuario, string? Documento, string? Password);
public record AdminEstudianteRequest(string? Nombre, string? Documento, int GrupoId, int? AcudienteId, string? Password);
public record AdminEstudianteUpdate(string? Nombre, string? Documento, int? GrupoId, int? AcudienteId, string? Password);
public record EstadoEstudianteRequest(bool? Activo, string? Motivo);
public record AdminGrupoRequest(string? Nombre);
public record AdminAcudienteRequest(string? Nombre, string? Documento, string? Telefono, string? Correo, string? Password, int[]? EstudianteIds);
public record VincularHijoRequest(int EstudianteId);
