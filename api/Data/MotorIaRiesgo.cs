namespace AsisQR.Api.Data;

public record DiagnosticoRiesgoIa(
    int EstudianteId,
    string Nombre,
    string Documento,
    string Grupo,
    string Nivel, // "Bajo", "Medio", "Alto", "Critico"
    int ScoreRiesgo, // 0 - 100
    decimal PromedioNotas,
    double PorcentajeAsistencia,
    int FaltasAcumuladas,
    int LlamadosConvivencia,
    List<string> Factores,
    string RecomendacionPedagogica
);

public static class MotorIaRiesgo
{
    public static DiagnosticoRiesgoIa Evaluar(
        Estudiante estudiante,
        List<Sesion> sesionesGrupo,
        List<Asistencia> asistenciasEstudiante,
        List<Nota> notasEstudiante,
        List<ObservacionConvivencia> observaciones)
    {
        var totalSesiones = sesionesGrupo.Count;
        var asistidas = asistenciasEstudiante.Count;
        int inasistencias;
        double pctAsistencia;

        if (asistenciasEstudiante.Any())
        {
            var primerRegistro = sesionesGrupo
                .Where(s => asistenciasEstudiante.Any(a => a.SesionId == s.Id))
                .OrderBy(s => s.Fecha)
                .ThenBy(s => s.CreadaEn)
                .FirstOrDefault();

            var sesionesDesdeIngreso = primerRegistro != null
                ? sesionesGrupo.Where(s => s.Fecha > primerRegistro.Fecha || (s.Fecha == primerRegistro.Fecha && s.CreadaEn >= primerRegistro.CreadaEn)).ToList()
                : sesionesGrupo;

            inasistencias = Math.Max(0, sesionesDesdeIngreso.Count - asistidas);
            pctAsistencia = sesionesDesdeIngreso.Count > 0
                ? Math.Round((double)asistidas / sesionesDesdeIngreso.Count * 100, 1)
                : 100.0;
        }
        else
        {
            // El estudiante no tiene asistencias aún (matrícula reciente o sin clases registradas)
            inasistencias = 0;
            pctAsistencia = 100.0;
        }

        var tieneNotas = notasEstudiante.Any();
        var promedio = tieneNotas
            ? Math.Round(notasEstudiante.Average(n => n.Valor), 2)
            : 0.0m;

        var llamados = observaciones.Count(o => o.Tipo is "Atencion" or "FaltaLeve" or "FaltaGrave");
        var felicitaciones = observaciones.Count(o => o.Tipo == "Felicitacion");

        // Cálculo de score de riesgo (0 = sin riesgo, 100 = riesgo extremo)
        double scoreAcademico = 0;
        if (tieneNotas)
        {
            if (promedio < 3.0m)
            {
                scoreAcademico = 40.0 + (double)(3.0m - promedio) / 3.0 * 60.0;
            }
            else if (promedio < 3.4m)
            {
                scoreAcademico = (double)(3.4m - promedio) / 0.4 * 25.0;
            }
        }

        double scoreAsistencia = 0;
        if (asistenciasEstudiante.Any() && pctAsistencia < 85.0)
        {
            scoreAsistencia = 30.0 + (85.0 - pctAsistencia) / 85.0 * 70.0;
        }

        double scoreConvivencia = Math.Min(100.0, llamados * 30.0) - Math.Min(30.0, felicitaciones * 15.0);
        if (scoreConvivencia < 0) scoreConvivencia = 0;

        // Ponderación: 50% Notas + 35% Asistencia + 15% Convivencia
        var scoreFinal = (int)Math.Clamp(
            Math.Round(scoreAcademico * 0.50 + scoreAsistencia * 0.35 + scoreConvivencia * 0.15),
            0,
            100
        );

        string nivel;
        if (scoreFinal >= 60) nivel = "Critico";
        else if (scoreFinal >= 40) nivel = "Alto";
        else if (scoreFinal >= 20 || (tieneNotas && promedio < 3.0m) || (asistenciasEstudiante.Any() && pctAsistencia < 75.0)) nivel = "Medio";
        else nivel = "Bajo";

        var factores = new List<string>();
        if (asistenciasEstudiante.Any() && pctAsistencia < 80.0)
            factores.Add($"Inasistencia elevada del {Math.Round(100.0 - pctAsistencia, 1)}% ({inasistencias} fallas registradas)");
        if (tieneNotas)
        {
            if (promedio < 3.0m)
                factores.Add($"Promedio reprobatorio actual de {promedio:F2} (mínimo aprobatorio: 3.0)");
            else if (promedio < 3.5m)
                factores.Add($"Promedio en zona vulnerable de {promedio:F2}");
        }
        if (llamados > 0)
            factores.Add($"{llamados} llamado(s) de atención en el observador escolar");
        if (felicitaciones > 0 && factores.Count == 0)
            factores.Add("Comportamiento positivo y desempeño constante");
        if (!tieneNotas && !asistenciasEstudiante.Any())
            factores.Add("Estudiante activo sin novedades registradas");

        // Generación de recomendación pedagógica asistida por IA
        string recomendacion;
        if (nivel == "Critico")
        {
            recomendacion = "ALERTA URGENTE: Notificar al acudiente de inmediato, programar plan de contingencia pedagógica y remitir a orientación escolar para prevenir pérdida de año o deserción.";
        }
        else if (nivel == "Alto")
        {
            recomendacion = "Requiere seguimiento semanal del director de grupo y asignación de talleres de refuerzo en las materias con notas menores a 3.0.";
        }
        else if (nivel == "Medio")
        {
            recomendacion = "Monitorear puntualidad en las primeras horas de clase y motivar la participación para elevar el promedio general.";
        }
        else
        {
            recomendacion = "Excelente trayectoria escolar. Mantener el ritmo académico y proponerlo como monitor de grupo.";
        }

        return new DiagnosticoRiesgoIa(
            estudiante.Id,
            estudiante.Nombre,
            estudiante.Documento,
            estudiante.Grupo?.Nombre ?? "Sin grupo",
            nivel,
            scoreFinal,
            promedio,
            pctAsistencia,
            inasistencias,
            llamados,
            factores,
            recomendacion
        );
    }
}
