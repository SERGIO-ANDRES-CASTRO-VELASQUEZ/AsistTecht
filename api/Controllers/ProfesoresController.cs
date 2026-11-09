using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize(Policy = "Director")]
[Route("api/profesores")]
public class ProfesoresController : ControllerBase
{
    private readonly AppDb _db;

    public ProfesoresController(AppDb db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var lista = await _db.Profesores
            .OrderBy(p => p.Nombre)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Usuario,
                cedula = p.Usuario,
                p.Activo,
                materiasCount = p.Materias.Count,
                gruposCount = p.Grupos.Count
            })
            .ToListAsync();
        return Ok(lista);
    }

    [HttpPost]
    public IActionResult Crear([FromBody] ProfesorRequest body)
    {
        return BadRequest(new { mensaje = "El perfil de Dirección no crea usuarios docentes. La creación y activación de docentes se realiza exclusivamente por el Administrador con Cédula de Ciudadanía." });
    }
}

public record ProfesorRequest(string? Nombre, string? Usuario, string? Password);
