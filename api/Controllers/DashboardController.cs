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
        var totalEstudiantes = await _db.Estudiantes.CountAsync(e => e.Activo);
        var totalProfesores = await _db.Profesores.CountAsync(p => p.Activo);
        var totalMaterias = await _db.Materias.CountAsync();
        var totalGrupos = await _db.Grupos.CountAsync();

        // 1. Sesiones y asistencia de hoy con conteo real de alumnos matriculados
        var sesionesHoy = await _db.Sesiones
            .Where(s => s.Fecha == hoy)
            .Include(s => s.Asistencias)
            .Include(s => s.Grupo)
                .ThenInclude(g => g!.Estudiantes)
            .ToListAsync();

        var totalAsistenciasHoy = sesionesHoy.Sum(s => s.Asistencias.Count);
        var totalEsperadosHoy = sesionesHoy.Sum(s => s.Grupo?.Estudiantes.Count(e => e.Activo) ?? 0);
        var totalFallasHoy = Math.Max(0, totalEsperadosHoy - totalAsistenciasHoy);
        var pctAsistenciaHoy = totalEsperadosHoy > 0
            ? Math.Round((double)totalAsistenciasHoy / totalEsperadosHoy * 100, 1)
            : (sesionesHoy.Count > 0 ? 100.0 : 0.0);

        // 2. Histórico de asistencia últimos 7 días con datos reales de la DB
        var historicoSemanal = new List<object>();
        for (int i = 6; i >= 0; i--)
        {
            var dia = hoy.AddDays(-i);
            var ses = await _db.Sesiones
                .Where(s => s.Fecha == dia)
                .Include(s => s.Asistencias)
                .Include(s => s.Grupo)
                    .ThenInclude(g => g!.Estudiantes)
                .ToListAsync();

            var presentes = ses.Sum(s => s.Asistencias.Count);
            var esperados = ses.Sum(s => s.Grupo?.Estudiantes.Count(e => e.Activo) ?? 0);
            var fallas = Math.Max(0, esperados - presentes);
            var pct = esperados > 0 ? Math.Round((double)presentes / esperados * 100, 1) : (ses.Any() ? 100.0 : 0.0);

            historicoSemanal.Add(new
            {
                fecha = dia.ToString("yyyy-MM-dd"),
                diaNombre = FormatearDiaSemana(dia.DayOfWeek),
                presentes,
                fallas,
                esperados,
                porcentaje = pct
            });
        }

        // 3. Obtener todas las sesiones, grupos, estudiantes y asistencias para análisis institucional
        var todosGrupos = await _db.Grupos
            .Include(g => g.Estudiantes)
            .OrderBy(g => g.Nombre)
            .ToListAsync();

        var todasSesiones = await _db.Sesiones
            .Include(s => s.Asistencias)
            .ToListAsync();

        var todasAsistencias = await _db.Asistencias.ToListAsync();

        // 4. Comparativa de Asistencia por Grupos / Cursos
        var asistenciaPorGrupos = todosGrupos.Select(g =>
        {
            var ests = g.Estudiantes.Where(e => e.Activo).ToList();
            var sesGrp = todasSesiones.Where(s => s.GrupoId == g.Id).ToList();
            var totalSes = sesGrp.Count;
            var totalEsp = ests.Count * totalSes;
            var totalAsist = sesGrp.Sum(s => s.Asistencias.Count);
            var totalFallas = Math.Max(0, totalEsp - totalAsist);
            var pctAsist = totalEsp > 0 ? Math.Round((double)totalAsist / totalEsp * 100, 1) : 100.0;
            var pctFallas = totalEsp > 0 ? Math.Round((double)totalFallas / totalEsp * 100, 1) : 0.0;

            return new
            {
                grupoId = g.Id,
                grupoNombre = g.Nombre,
                totalEstudiantes = ests.Count,
                totalSesiones = totalSes,
                totalEsperados = totalEsp,
                totalAsistencias = totalAsist,
                totalFallas,
                porcentajeAsistencia = pctAsist,
                porcentajeFallas = pctFallas
            };
        }).ToList();

        // 5. Distribución y Métodos de Asistencia Global
        var totalPresencias = todasAsistencias.Count;
        var origenQr = todasAsistencias.Count(a => a.Origen == "Qr");
        var origenRostro = todasAsistencias.Count(a => a.Origen == "Rostro");
        var origenManual = Math.Max(0, totalPresencias - origenQr - origenRostro);
        var totalEsperadosGlobal = asistenciaPorGrupos.Sum(g => g.totalEsperados);
        var totalFallasGlobal = Math.Max(0, totalEsperadosGlobal - totalPresencias);
        var tasaAsistenciaGlobal = totalEsperadosGlobal > 0 ? Math.Round((double)totalPresencias / totalEsperadosGlobal * 100, 1) : 100.0;
        var tasaAusentismoGlobal = totalEsperadosGlobal > 0 ? Math.Round((double)totalFallasGlobal / totalEsperadosGlobal * 100, 1) : 0.0;

        var distribucionAsistencia = new
        {
            totalPresencias,
            totalFallas = totalFallasGlobal,
            totalEsperados = totalEsperadosGlobal,
            origenQr,
            origenRostro,
            origenManual,
            porcentajeAsistencia = tasaAsistenciaGlobal,
            porcentajeAusentismo = tasaAusentismoGlobal
        };

        // 6. Análisis Profundo de Estudiantes que Fallan (Semáforo de Inasistencias)
        var estudiantesDb = await _db.Estudiantes
            .Where(e => e.Activo)
            .Include(e => e.Grupo)
            .Include(e => e.Acudiente)
            .Include(e => e.Observaciones)
            .ToListAsync();

        var todasNotas = await _db.Notas.ToListAsync();

        var diagnosticos = new List<DiagnosticoRiesgoIa>();
        var estudiantesConFallas = new List<object>();

        foreach (var est in estudiantesDb)
        {
            var sesGrupo = todasSesiones.Where(s => s.GrupoId == est.GrupoId).OrderBy(s => s.Fecha).ToList();
            var asistEst = todasAsistencias.Where(a => a.EstudianteId == est.Id).ToList();
            var notasEst = todasNotas.Where(n => n.EstudianteId == est.Id).ToList();

            diagnosticos.Add(MotorIaRiesgo.Evaluar(est, sesGrupo, asistEst, notasEst, est.Observaciones));

            var totalSes = sesGrupo.Count;
            var totalAsist = asistEst.Count;
            var fallas = Math.Max(0, totalSes - totalAsist);
            var pctInasistencia = totalSes > 0 ? Math.Round((double)fallas / totalSes * 100, 1) : 0.0;
            var pctAsist = Math.Round(100.0 - pctInasistencia, 1);

            string nivelRiesgo;
            if (pctInasistencia >= 25.0 && fallas >= 2) nivelRiesgo = "Critico";
            else if (pctInasistencia >= 15.0 && fallas >= 1) nivelRiesgo = "Alto";
            else if (fallas > 0) nivelRiesgo = "Medio";
            else nivelRiesgo = "Bajo";

            var ultSesFaltada = sesGrupo
                .Where(s => !asistEst.Any(a => a.SesionId == s.Id))
                .OrderByDescending(s => s.Fecha)
                .FirstOrDefault();

            estudiantesConFallas.Add(new
            {
                estudianteId = est.Id,
                nombre = est.Nombre,
                documento = est.Documento,
                grupoId = est.GrupoId,
                grupo = est.Grupo?.Nombre ?? "Sin grupo",
                totalSesiones = totalSes,
                totalAsistencias = totalAsist,
                totalFallas = fallas,
                porcentajeInasistencia = pctInasistencia,
                porcentajeAsistencia = pctAsist,
                nivelRiesgo,
                ultimaFalla = ultSesFaltada?.Fecha.ToString("yyyy-MM-dd") ?? "Sin inasistencias",
                acudienteNombre = est.Acudiente?.Nombre ?? "No asignado",
                acudienteTelefono = est.Acudiente?.Telefono ?? "Sin registro",
                acudienteCorreo = est.Acudiente?.Correo ?? "Sin registro",
                anotacionesConvivencia = est.Observaciones.Count
            });
        }

        var estudiantesOrdenados = estudiantesConFallas
            .OrderByDescending(e => ((dynamic)e).totalFallas)
            .ThenByDescending(e => ((dynamic)e).porcentajeInasistencia)
            .ToList();

        var enRiesgo = diagnosticos
            .Where(d => d.Nivel is "Critico" or "Alto" or "Medio")
            .OrderByDescending(d => d.ScoreRiesgo)
            .ToList();

        var aprobados = todasNotas.Count(n => n.Valor >= 3.0m);
        var reprobados = todasNotas.Count(n => n.Valor < 3.0m);
        var promedioGeneral = todasNotas.Any() ? Math.Round(todasNotas.Average(n => n.Valor), 2) : 0.0m;

        // 7. Convivencia reciente
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
                fallasHoy = totalFallasHoy,
                promedioGeneral,
                estudiantesEnRiesgo = enRiesgo.Count(r => r.Nivel is "Critico" or "Alto"),
                totalConvivencia,
                totalFallasGlobales = totalFallasGlobal,
                tasaAusentismoGlobal = tasaAusentismoGlobal
            },
            historicoSemanal,
            asistenciaPorGrupos,
            distribucionAsistencia,
            estudiantesConFallas = estudiantesOrdenados,
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
        var grupos = await _db.Grupos
            .Where(g => g.ProfesorId == id || g.Materias.Any(m => m.Materia!.ProfesorId == id))
            .Include(g => g.Estudiantes)
            .ToListAsync();

        var sesionesHoy = await _db.Sesiones
            .Where(s => s.ProfesorId == id && s.Fecha == hoy)
            .Include(s => s.Asistencias)
            .Include(s => s.Grupo)
                .ThenInclude(g => g!.Estudiantes)
            .ToListAsync();

        var totalPresentesHoy = sesionesHoy.Sum(s => s.Asistencias.Count);
        var totalEsperadosHoy = sesionesHoy.Sum(s => s.Grupo?.Estudiantes.Count(e => e.Activo) ?? 0);
        var totalFallasHoy = Math.Max(0, totalEsperadosHoy - totalPresentesHoy);
        var pctHoy = totalEsperadosHoy > 0
            ? Math.Round((double)totalPresentesHoy / totalEsperadosHoy * 100, 1)
            : (sesionesHoy.Count > 0 ? 100.0 : 0.0);

        // 1. Histórico semanal de las clases del profesor (últimos 7 días)
        var historicoSemanal = new List<object>();
        for (int i = 6; i >= 0; i--)
        {
            var dia = hoy.AddDays(-i);
            var ses = await _db.Sesiones
                .Where(s => s.ProfesorId == id && s.Fecha == dia)
                .Include(s => s.Asistencias)
                .Include(s => s.Grupo)
                    .ThenInclude(g => g!.Estudiantes)
                .ToListAsync();

            var presentes = ses.Sum(s => s.Asistencias.Count);
            var esperados = ses.Sum(s => s.Grupo?.Estudiantes.Count(e => e.Activo) ?? 0);
            var fallas = Math.Max(0, esperados - presentes);
            var pct = esperados > 0 ? Math.Round((double)presentes / esperados * 100, 1) : (ses.Any() ? 100.0 : 0.0);

            historicoSemanal.Add(new
            {
                fecha = dia.ToString("yyyy-MM-dd"),
                diaNombre = FormatearDiaSemana(dia.DayOfWeek),
                presentes,
                fallas,
                esperados,
                porcentaje = pct
            });
        }

        // 2. Sesiones, asistencias y estudiantes vinculados al docente
        var sesionesProf = await _db.Sesiones
            .Where(s => s.ProfesorId == id)
            .Include(s => s.Asistencias)
            .ToListAsync();

        var asistenciasProf = await _db.Asistencias
            .Where(a => a.Sesion!.ProfesorId == id)
            .ToListAsync();

        var estudiantes = await _db.Estudiantes
            .Where(e => e.Activo && e.Grupo != null && (e.Grupo.ProfesorId == id || e.Grupo.Materias.Any(v => v.Materia!.ProfesorId == id)))
            .Include(e => e.Grupo)
            .Include(e => e.Acudiente)
            .Include(e => e.Observaciones)
            .ToListAsync();

        // 3. Comparativa de Asistencia por Grupos Asignados al Profesor
        var asistenciaPorGrupos = grupos.Select(g =>
        {
            var ests = g.Estudiantes.Where(e => e.Activo).ToList();
            var sesGrp = sesionesProf.Where(s => s.GrupoId == g.Id).ToList();
            var totalSes = sesGrp.Count;
            var totalEsp = ests.Count * totalSes;
            var totalAsist = sesGrp.Sum(s => s.Asistencias.Count);
            var totalFallas = Math.Max(0, totalEsp - totalAsist);
            var pctAsist = totalEsp > 0 ? Math.Round((double)totalAsist / totalEsp * 100, 1) : 100.0;
            var pctFallas = totalEsp > 0 ? Math.Round((double)totalFallas / totalEsp * 100, 1) : 0.0;

            return new
            {
                grupoId = g.Id,
                grupoNombre = g.Nombre,
                totalEstudiantes = ests.Count,
                totalSesiones = totalSes,
                totalEsperados = totalEsp,
                totalAsistencias = totalAsist,
                totalFallas,
                porcentajeAsistencia = pctAsist,
                porcentajeFallas = pctFallas
            };
        }).OrderBy(g => g.grupoNombre).ToList();

        // 4. Distribución de asistencia en clases del docente
        var totalPresencias = asistenciasProf.Count;
        var origenQr = asistenciasProf.Count(a => a.Origen == "Qr");
        var origenRostro = asistenciasProf.Count(a => a.Origen == "Rostro");
        var origenManual = Math.Max(0, totalPresencias - origenQr - origenRostro);
        var totalEsperadosProf = asistenciaPorGrupos.Sum(g => g.totalEsperados);
        var totalFallasProf = Math.Max(0, totalEsperadosProf - totalPresencias);
        var tasaAsistProf = totalEsperadosProf > 0 ? Math.Round((double)totalPresencias / totalEsperadosProf * 100, 1) : 100.0;
        var tasaAusentismoProf = totalEsperadosProf > 0 ? Math.Round((double)totalFallasProf / totalEsperadosProf * 100, 1) : 0.0;

        var distribucionAsistencia = new
        {
            totalPresencias,
            totalFallas = totalFallasProf,
            totalEsperados = totalEsperadosProf,
            origenQr,
            origenRostro,
            origenManual,
            porcentajeAsistencia = tasaAsistProf,
            porcentajeAusentismo = tasaAusentismoProf
        };

        // 5. Análisis de Estudiantes que Fallan en las Clases del Docente
        var notas = await _db.Notas
            .Where(n => n.Columna != null && n.Columna.Materia != null && n.Columna.Materia.ProfesorId == id)
            .ToListAsync();

        var alertasIa = new List<DiagnosticoRiesgoIa>();
        var estudiantesConFallas = new List<object>();

        foreach (var est in estudiantes)
        {
            var sesGrupo = sesionesProf.Where(s => s.GrupoId == est.GrupoId).OrderBy(s => s.Fecha).ToList();
            var asistEst = asistenciasProf.Where(a => a.EstudianteId == est.Id).ToList();
            var notasEst = notas.Where(n => n.EstudianteId == est.Id).ToList();

            var diag = MotorIaRiesgo.Evaluar(est, sesGrupo, asistEst, notasEst, est.Observaciones);
            if (diag.Nivel is "Critico" or "Alto" or "Medio")
            {
                alertasIa.Add(diag);
            }

            var totalSes = sesGrupo.Count;
            var totalAsist = asistEst.Count;
            var fallas = Math.Max(0, totalSes - totalAsist);
            var pctInasistencia = totalSes > 0 ? Math.Round((double)fallas / totalSes * 100, 1) : 0.0;
            var pctAsist = Math.Round(100.0 - pctInasistencia, 1);

            string nivelRiesgo;
            if (pctInasistencia >= 25.0 && fallas >= 2) nivelRiesgo = "Critico";
            else if (pctInasistencia >= 15.0 && fallas >= 1) nivelRiesgo = "Alto";
            else if (fallas > 0) nivelRiesgo = "Medio";
            else nivelRiesgo = "Bajo";

            var ultSesFaltada = sesGrupo
                .Where(s => !asistEst.Any(a => a.SesionId == s.Id))
                .OrderByDescending(s => s.Fecha)
                .FirstOrDefault();

            estudiantesConFallas.Add(new
            {
                estudianteId = est.Id,
                nombre = est.Nombre,
                documento = est.Documento,
                grupoId = est.GrupoId,
                grupo = est.Grupo?.Nombre ?? "Sin grupo",
                totalSesiones = totalSes,
                totalAsistencias = totalAsist,
                totalFallas = fallas,
                porcentajeInasistencia = pctInasistencia,
                porcentajeAsistencia = pctAsist,
                nivelRiesgo,
                ultimaFalla = ultSesFaltada?.Fecha.ToString("yyyy-MM-dd") ?? "Sin inasistencias",
                acudienteNombre = est.Acudiente?.Nombre ?? "No asignado",
                acudienteTelefono = est.Acudiente?.Telefono ?? "Sin registro",
                acudienteCorreo = est.Acudiente?.Correo ?? "Sin registro",
                anotacionesConvivencia = est.Observaciones.Count
            });
        }

        var estudiantesOrdenados = estudiantesConFallas
            .OrderByDescending(e => ((dynamic)e).totalFallas)
            .ThenByDescending(e => ((dynamic)e).porcentajeInasistencia)
            .ToList();

        var aprobados = notas.Count(n => n.Valor >= 3.0m);
        var reprobados = notas.Count(n => n.Valor < 3.0m);

        // 6. Convivencia reciente para el profesor
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
                fallasHoy = totalFallasHoy,
                estudiantesEnRiesgo = alertasIa.Count(a => a.Nivel is "Critico" or "Alto"),
                totalConvivencia = totalConvivenciaProf,
                totalFallasMisCursos = totalFallasProf,
                tasaAusentismoMisCursos = tasaAusentismoProf
            },
            historicoSemanal,
            asistenciaPorGrupos,
            distribucionAsistencia,
            estudiantesConFallas = estudiantesOrdenados,
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

    private static string FormatearDiaSemana(DayOfWeek day) => day switch
    {
        DayOfWeek.Monday => "Lunes",
        DayOfWeek.Tuesday => "Martes",
        DayOfWeek.Wednesday => "Miércoles",
        DayOfWeek.Thursday => "Jueves",
        DayOfWeek.Friday => "Viernes",
        DayOfWeek.Saturday => "Sábado",
        DayOfWeek.Sunday => "Domingo",
        _ => day.ToString()
    };

    private int UsuarioId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
