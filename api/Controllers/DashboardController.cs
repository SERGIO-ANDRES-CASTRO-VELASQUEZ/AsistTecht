using System.Security.Claims;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly AppDb _db;

    public DashboardController(AppDb db) => _db = db;

    [Authorize(Policy = "Director")]
    [HttpGet("director")]
    public async Task<IActionResult> Director()
    {
        var hoy = Reloj.Hoy();
        var totalEstudiantes = await _db.Estudiantes.CountAsync();
        var totalProfesores = await _db.Profesores.CountAsync();
        var totalMaterias = await _db.Materias.CountAsync();
        var totalGrupos = await _db.Grupos.CountAsync();

        // Sesiones y asistencia de hoy
        var sesionesHoy = await _db.Sesiones
            .Where(s => s.Fecha == hoy)
            .Include(s => s.Asistencias)
            .Include(s => s.Grupo)
            .ToListAsync();

        var totalAsistenciasHoy = sesionesHoy.Sum(s => s.Asistencias.Count);
        var totalEsperadosHoy = sesionesHoy.Sum(s => s.Grupo?.Estudiantes.Count ?? 0);
        var pctAsistenciaHoy = totalEsperadosHoy > 0
            ? Math.Round((double)totalAsistenciasHoy / totalEsperadosHoy * 100, 1)
            : (totalEstudiantes > 0 ? 90.0 : 0.0);

        // Histórico de asistencia últimos 7 días
        var historicoSemanal = new List<object>();
        for (int i = 6; i >= 0; i--)
        {
            var dia = hoy.AddDays(-i);
            var ses = await _db.Sesiones
                .Where(s => s.Fecha == dia)
                .Include(s => s.Asistencias)
                .Include(s => s.Grupo)
                .ToListAsync();

            var presentes = ses.Sum(s => s.Asistencias.Count);
            var esperados = ses.Sum(s => s.Grupo?.Estudiantes.Count ?? 0);
            var pct = esperados > 0 ? Math.Round((double)presentes / esperados * 100, 1) : 0.0;

            historicoSemanal.Add(new
            {
                fecha = dia.ToString("yyyy-MM-dd"),
                diaNombre = dia.DayOfWeek.ToString(),
                presentes,
                esperados,
                porcentaje = pct
            });
        }

        // Distribución general de notas
        var todasNotas = await _db.Notas.ToListAsync();
        var aprobados = todasNotas.Count(n => n.Valor >= 3.0m);
        var reprobados = todasNotas.Count(n => n.Valor < 3.0m);
        var promedioGeneral = todasNotas.Any() ? Math.Round(todasNotas.Average(n => n.Valor), 2) : 3.5m;

        // Evaluación de riesgo escolar con IA (Early Warning System)
        var estudiantes = await _db.Estudiantes
            .Include(e => e.Grupo)
            .Include(e => e.Observaciones)
            .ToListAsync();

        var sesiones = await _db.Sesiones.ToListAsync();
        var asistencias = await _db.Asistencias.ToListAsync();
        var notas = await _db.Notas.ToListAsync();

        var diagnosticos = new List<DiagnosticoRiesgoIa>();
        foreach (var est in estudiantes)
        {
            var sesGrupo = sesiones.Where(s => s.GrupoId == est.GrupoId).ToList();
            var asistEst = asistencias.Where(a => a.EstudianteId == est.Id).ToList();
            var notasEst = notas.Where(n => n.EstudianteId == est.Id).ToList();
            var obsEst = est.Observaciones;

            diagnosticos.Add(MotorIaRiesgo.Evaluar(est, sesGrupo, asistEst, notasEst, obsEst));
        }

        var enRiesgo = diagnosticos
            .Where(d => d.Nivel is "Critico" or "Alto" or "Medio")
            .OrderByDescending(d => d.ScoreRiesgo)
            .ToList();

        // Convivencia institucional reciente
        var totalConvivencia = await _db.ObservacionesConvivencia.CountAsync();
        var convivenciaReciente = await _db.ObservacionesConvivencia
            .OrderByDescending(o => o.Fecha)
            .ThenByDescending(o => o.Id)
            .Take(8)
            .Select(o => new
            {
                o.Id,
                o.EstudianteId,
                estudianteNombre = o.Estudiante!.Nombre,
                estudianteDocumento = o.Estudiante.Documento,
                grupo = o.Estudiante.Grupo != null ? o.Estudiante.Grupo.Nombre : "Sin grupo",
                profesorNombre = o.Profesor!.Nombre,
                o.Tipo,
                o.Titulo,
                o.Descripcion,
                o.Compromiso,
                fecha = o.Fecha.ToString("yyyy-MM-dd"),
                o.NotificadoAcudiente
            })
            .ToListAsync();

        return Ok(new
        {
            kpis = new
            {
                totalEstudiantes,
                totalProfesores,
                totalMaterias,
                totalGrupos,
                asistenciaHoy = pctAsistenciaHoy,
                presentesHoy = totalAsistenciasHoy,
                promedioGeneral,
                estudiantesEnRiesgo = enRiesgo.Count(r => r.Nivel is "Critico" or "Alto"),
                totalConvivencia
            },
            historicoSemanal,
            distribucionNotas = new { aprobados, reprobados, total = todasNotas.Count },
            alertasIa = enRiesgo,
            observacionesRecientes = convivenciaReciente
        });
    }

    [Authorize(Policy = "Profesor")]
    [HttpGet("profesor")]
    public async Task<IActionResult> Profesor()
    {
        var id = UsuarioId();
        var hoy = Reloj.Hoy();

        var materias = await _db.Materias.Where(m => m.ProfesorId == id).ToListAsync();
        var grupos = await _db.Grupos.Where(g => g.ProfesorId == id).ToListAsync();

        var sesionesHoy = await _db.Sesiones
            .Where(s => s.ProfesorId == id && s.Fecha == hoy)
            .Include(s => s.Asistencias)
            .Include(s => s.Grupo)
            .ToListAsync();

        var totalPresentesHoy = sesionesHoy.Sum(s => s.Asistencias.Count);
        var totalEsperadosHoy = sesionesHoy.Sum(s => s.Grupo?.Estudiantes.Count ?? 0);
        var pctHoy = totalEsperadosHoy > 0 ? Math.Round((double)totalPresentesHoy / totalEsperadosHoy * 100, 1) : 0.0;

        // Estudiantes del profesor
        var estudiantes = await _db.Estudiantes
            .Where(e => e.Grupo != null && (e.Grupo.ProfesorId == id || e.Grupo.Materias.Any(v => v.Materia!.ProfesorId == id)))
            .Include(e => e.Grupo)
            .Include(e => e.Observaciones)
            .ToListAsync();

        var sesiones = await _db.Sesiones.Where(s => s.ProfesorId == id).ToListAsync();
        var asistencias = await _db.Asistencias.Where(a => a.Sesion!.ProfesorId == id).ToListAsync();
        var notas = await _db.Notas
            .Where(n => n.Columna!.Materia!.ProfesorId == id)
            .ToListAsync();

        var alertasIa = new List<DiagnosticoRiesgoIa>();
        foreach (var est in estudiantes)
        {
            var sesGrupo = sesiones.Where(s => s.GrupoId == est.GrupoId).ToList();
            var asistEst = asistencias.Where(a => a.EstudianteId == est.Id).ToList();
            var notasEst = notas.Where(n => n.EstudianteId == est.Id).ToList();

            var diag = MotorIaRiesgo.Evaluar(est, sesGrupo, asistEst, notasEst, est.Observaciones);
            if (diag.Nivel is "Critico" or "Alto" or "Medio")
            {
                alertasIa.Add(diag);
            }
        }

        var aprobados = notas.Count(n => n.Valor >= 3.0m);
        var reprobados = notas.Count(n => n.Valor < 3.0m);

        // Anotaciones en observador para este profesor o sus estudiantes
        var totalConvivenciaProf = await _db.ObservacionesConvivencia
            .CountAsync(o => o.ProfesorId == id || (o.Estudiante != null && o.Estudiante.Grupo != null && (o.Estudiante.Grupo.ProfesorId == id || o.Estudiante.Grupo.Materias.Any(m => m.Materia!.ProfesorId == id))));

        var convivenciaRecienteProf = await _db.ObservacionesConvivencia
            .Where(o => o.ProfesorId == id || (o.Estudiante != null && o.Estudiante.Grupo != null && (o.Estudiante.Grupo.ProfesorId == id || o.Estudiante.Grupo.Materias.Any(m => m.Materia!.ProfesorId == id))))
            .OrderByDescending(o => o.Fecha)
            .ThenByDescending(o => o.Id)
            .Take(6)
            .Select(o => new
            {
                o.Id,
                o.EstudianteId,
                estudianteNombre = o.Estudiante!.Nombre,
                estudianteDocumento = o.Estudiante.Documento,
                grupo = o.Estudiante.Grupo != null ? o.Estudiante.Grupo.Nombre : "Sin grupo",
                profesorNombre = o.Profesor!.Nombre,
                o.Tipo,
                o.Titulo,
                o.Descripcion,
                o.Compromiso,
                fecha = o.Fecha.ToString("yyyy-MM-dd"),
                o.NotificadoAcudiente
            })
            .ToListAsync();

        return Ok(new
        {
            kpis = new
            {
                totalMaterias = materias.Count,
                totalGrupos = grupos.Count,
                totalEstudiantes = estudiantes.Count,
                asistenciaHoy = pctHoy,
                presentesHoy = totalPresentesHoy,
                estudiantesEnRiesgo = alertasIa.Count(a => a.Nivel is "Critico" or "Alto"),
                totalConvivencia = totalConvivenciaProf
            },
            distribucionNotas = new { aprobados, reprobados, total = notas.Count },
            alertasIa = alertasIa.OrderByDescending(a => a.ScoreRiesgo).ToList(),
            observacionesRecientes = convivenciaRecienteProf
        });
    }

    [Authorize(Policy = "Acudiente")]
    [HttpGet("acudiente")]
    public async Task<IActionResult> Acudiente()
    {
        var id = UsuarioId();
        var acudiente = await _db.Acudientes
            .Include(a => a.Estudiantes)
                .ThenInclude(e => e.Grupo)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (acudiente is null) return Unauthorized();

        var hoy = Reloj.Hoy();
        var hijosData = new List<object>();

        foreach (var hijo in acudiente.Estudiantes)
        {
            // Asistencia de hoy
            var sesionesHoy = await _db.Sesiones
                .Where(s => s.GrupoId == hijo.GrupoId && s.Fecha == hoy)
                .Include(s => s.Materia)
                .ToListAsync();

            var asistenciasHoy = await _db.Asistencias
                .Where(a => a.EstudianteId == hijo.Id && a.Sesion!.Fecha == hoy)
                .Include(a => a.Sesion!.Materia)
                .ToListAsync();

            // Histórico general
            var totalSesiones = await _db.Sesiones.CountAsync(s => s.GrupoId == hijo.GrupoId);
            var totalAsistidas = await _db.Asistencias.CountAsync(a => a.EstudianteId == hijo.Id);
            var inasistencias = Math.Max(0, totalSesiones - totalAsistidas);
            var pctAsistencia = totalSesiones > 0 ? Math.Round((double)totalAsistidas / totalSesiones * 100, 1) : 100.0;

            // Notas
            var notasHijo = await _db.Notas
                .Where(n => n.EstudianteId == hijo.Id)
                .Include(n => n.Columna!.Materia)
                .ToListAsync();

            var promedio = notasHijo.Any() ? Math.Round(notasHijo.Average(n => n.Valor), 2) : 3.5m;

            // Convivencia
            var observaciones = await _db.ObservacionesConvivencia
                .Where(o => o.EstudianteId == hijo.Id)
                .OrderByDescending(o => o.Fecha)
                .Take(5)
                .Select(o => new
                {
                    o.Id,
                    o.Tipo,
                    o.Titulo,
                    o.Descripcion,
                    o.Compromiso,
                    fecha = o.Fecha.ToString("yyyy-MM-dd")
                })
                .ToListAsync();

            // Diagnóstico IA
            var sesGrupo = await _db.Sesiones.Where(s => s.GrupoId == hijo.GrupoId).ToListAsync();
            var asistEst = await _db.Asistencias.Where(a => a.EstudianteId == hijo.Id).ToListAsync();
            var diag = MotorIaRiesgo.Evaluar(
                hijo,
                sesGrupo,
                asistEst,
                notasHijo,
                await _db.ObservacionesConvivencia.Where(o => o.EstudianteId == hijo.Id).ToListAsync()
            );

            hijosData.Add(new
            {
                hijo.Id,
                hijo.Nombre,
                hijo.Documento,
                grupo = hijo.Grupo?.Nombre ?? "Sin grupo",
                asistenciaHoy = new
                {
                    clasesHoy = sesionesHoy.Count,
                    asistio = asistenciasHoy.Any(),
                    detalle = asistenciasHoy.Select(a => new
                    {
                        materia = a.Sesion!.Materia!.Nombre,
                        hora = a.MarcadaEn.ToString("HH:mm:ss"),
                        origen = a.Origen
                    })
                },
                estadisticas = new
                {
                    porcentajeAsistencia = pctAsistencia,
                    fallasAcumuladas = inasistencias,
                    promedioGeneral = promedio
                },
                observaciones,
                diagnosticoIa = diag
            });
        }

        return Ok(new
        {
            acudiente = new { acudiente.Nombre, acudiente.Documento, acudiente.Telefono, acudiente.Correo },
            hijos = hijosData
        });
    }

    private int UsuarioId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
