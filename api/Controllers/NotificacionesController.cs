using System.Security.Claims;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notificaciones")]
public class NotificacionesController : ControllerBase
{
    private readonly AppDb _db;

    public NotificacionesController(AppDb db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var rol = User.FindFirstValue(ClaimTypes.Role) ?? "";
        var id = UsuarioId();

        // Verificar si la base de datos ya tiene notificaciones sembradas para este rol
        var tieneNotifs = await _db.Notificaciones.AnyAsync(n =>
            n.RolDestinatario == "Todos" ||
            (n.RolDestinatario == rol && (n.UsuarioDestinatarioId == null || n.UsuarioDestinatarioId == id)));

        if (!tieneNotifs)
        {
            await SembrarNotificacionesIniciales(rol, id);
        }

        var lista = await _db.Notificaciones
            .Where(n => n.RolDestinatario == "Todos" ||
                        (n.RolDestinatario == rol && (n.UsuarioDestinatarioId == null || n.UsuarioDestinatarioId == id)))
            .OrderByDescending(n => n.Fecha)
            .Take(30)
            .Select(n => new
            {
                n.Id,
                n.Titulo,
                n.Mensaje,
                n.Tipo,
                n.Link,
                n.Leida,
                fecha = n.Fecha.ToString("yyyy-MM-dd HH:mm:ss")
            })
            .ToListAsync();

        var noLeidas = lista.Count(n => !n.Leida);

        return Ok(new
        {
            total = lista.Count,
            noLeidas,
            notificaciones = lista
        });
    }

    [HttpPost("marcar-leida/{id:int}")]
    public async Task<IActionResult> MarcarLeida(int id)
    {
        var notif = await _db.Notificaciones.FindAsync(id);
        if (notif is not null)
        {
            notif.Leida = true;
            await _db.SaveChangesAsync();
        }
        return Ok(new { exito = true });
    }

    [HttpPost("marcar-todas")]
    public async Task<IActionResult> MarcarTodas()
    {
        var rol = User.FindFirstValue(ClaimTypes.Role) ?? "";
        var id = UsuarioId();

        var notifs = await _db.Notificaciones
            .Where(n => !n.Leida && (n.RolDestinatario == "Todos" ||
                                     (n.RolDestinatario == rol && (n.UsuarioDestinatarioId == null || n.UsuarioDestinatarioId == id))))
            .ToListAsync();

        foreach (var n in notifs)
        {
            n.Leida = true;
        }

        await _db.SaveChangesAsync();
        return Ok(new { exito = true, actualizadas = notifs.Count });
    }

    private async Task SembrarNotificacionesIniciales(string rol, int usuarioId)
    {
        var ahora = DateTime.UtcNow;

        if (rol == "Estudiante")
        {
            _db.Notificaciones.AddRange(
                new Notificacion
                {
                    RolDestinatario = "Estudiante",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "¡Bienvenido a AsisTecht!",
                    Mensaje = "Tu carnet digital institucional con código QR y reconocimiento facial está activo.",
                    Tipo = "Info",
                    Link = "/estudiante",
                    Leida = false,
                    Fecha = ahora.AddHours(-1)
                },
                new Notificacion
                {
                    RolDestinatario = "Estudiante",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "Nueva Calificación Registrada",
                    Mensaje = "El profesor ha calificado tu Taller de Álgebra con nota de 4.5 [SUPERIOR].",
                    Tipo = "Academica",
                    Link = "/estudiante/notas",
                    Leida = false,
                    Fecha = ahora.AddMinutes(-45)
                },
                new Notificacion
                {
                    RolDestinatario = "Estudiante",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "Boletín Oficial Publicado",
                    Mensaje = "Tu informe de calificaciones del Primer Periodo 2026 ya está disponible para descargar en PDF.",
                    Tipo = "Academica",
                    Link = "/estudiante/boletin",
                    Leida = false,
                    Fecha = ahora.AddMinutes(-30)
                },
                new Notificacion
                {
                    RolDestinatario = "Estudiante",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "Entrada al Plantel Confirmada",
                    Mensaje = "Se registró tu ingreso al aula a las 07:02 AM mediante reconocimiento biométrico.",
                    Tipo = "Asistencia",
                    Link = "/estudiante/notas",
                    Leida = true,
                    Fecha = ahora.AddMinutes(-15)
                }
            );
        }
        else if (rol == "Profesor")
        {
            _db.Notificaciones.AddRange(
                new Notificacion
                {
                    RolDestinatario = "Profesor",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "Alerta de Deserción IA",
                    Mensaje = "El modelo predictivo identificó 1 estudiante en riesgo académico en el Grupo 10A.",
                    Tipo = "AlertaIa",
                    Link = "/profesor",
                    Leida = false,
                    Fecha = ahora.AddHours(-2)
                },
                new Notificacion
                {
                    RolDestinatario = "Profesor",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "Planilla de Calificaciones Lista",
                    Mensaje = "Se habilitó el registro de notas para el cierre del Primer Periodo Académico.",
                    Tipo = "Academica",
                    Link = "/profesor/planilla",
                    Leida = false,
                    Fecha = ahora.AddHours(-1)
                },
                new Notificacion
                {
                    RolDestinatario = "Profesor",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "Cámara de Asistencia Lista",
                    Mensaje = "El sistema de lectura de QR múltiple y biometría facial está listo para la clase de hoy.",
                    Tipo = "Asistencia",
                    Link = "/profesor/clase",
                    Leida = true,
                    Fecha = ahora.AddMinutes(-10)
                }
            );
        }
        else if (rol == "Acudiente")
        {
            _db.Notificaciones.AddRange(
                new Notificacion
                {
                    RolDestinatario = "Acudiente",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "Entrada al Colegio Registrada",
                    Mensaje = "Laura Mendoza ha ingresado al aula puntualmente a las 07:02 AM por reconocimiento facial.",
                    Tipo = "Asistencia",
                    Link = "/acudiente",
                    Leida = false,
                    Fecha = ahora.AddHours(-1)
                },
                new Notificacion
                {
                    RolDestinatario = "Acudiente",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "Nueva Calificación Publicada",
                    Mensaje = "Laura obtuvo 4.5 en Taller de Álgebra (Desempeño Superior).",
                    Tipo = "Academica",
                    Link = "/acudiente/boletin",
                    Leida = false,
                    Fecha = ahora.AddMinutes(-40)
                },
                new Notificacion
                {
                    RolDestinatario = "Acudiente",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "Felicitación en el Observador",
                    Mensaje = "El docente registró una felicitación por excelente disciplina y participación en clase.",
                    Tipo = "Convivencia",
                    Link = "/acudiente/convivencia",
                    Leida = false,
                    Fecha = ahora.AddMinutes(-20)
                }
            );
        }
        else if (rol == "Director")
        {
            _db.Notificaciones.AddRange(
                new Notificacion
                {
                    RolDestinatario = "Director",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "Reporte Ejecutivo Diario",
                    Mensaje = "La asistencia institucional promedio de hoy se ubica en 94.2%.",
                    Tipo = "Info",
                    Link = "/director",
                    Leida = false,
                    Fecha = ahora.AddHours(-2)
                },
                new Notificacion
                {
                    RolDestinatario = "Director",
                    UsuarioDestinatarioId = usuarioId,
                    Titulo = "Balance de Calificaciones",
                    Mensaje = "88% de los estudiantes del plantel se encuentran en desempeño básico, alto o superior.",
                    Tipo = "Academica",
                    Link = "/director",
                    Leida = false,
                    Fecha = ahora.AddMinutes(-50)
                }
            );
        }

        await _db.SaveChangesAsync();
    }

    private int UsuarioId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
