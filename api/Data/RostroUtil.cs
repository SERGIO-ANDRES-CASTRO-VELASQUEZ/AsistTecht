using System.Text.Json;

namespace AsisQR.Api.Data;

public static class RostroUtil
{
    public static readonly string[] Poses = ["frente", "arriba", "abajo", "izquierda", "derecha"];

    public const double Umbral = 0.50;
    public const double Margen = 0.08;

    public static bool PoseValida(string pose) => Poses.Contains(pose);

    public static string Guardar(float[] vector)
    {
        if (vector.Length != 128 || vector.Any(n => float.IsNaN(n) || float.IsInfinity(n)))
            throw new ArgumentException("El vector de la cara no es válido.");
        return JsonSerializer.Serialize(vector);
    }

    public static float[] Leer(string json)
    {
        var vector = JsonSerializer.Deserialize<float[]>(json);
        if (vector is null || vector.Length != 128)
            throw new InvalidOperationException("Vector guardado inválido.");
        return vector;
    }

    public static double Distancia(float[] a, float[] b)
    {
        double suma = 0;
        for (var i = 0; i < a.Length; i++)
        {
            var resta = a[i] - b[i];
            suma += resta * resta;
        }
        return Math.Sqrt(suma);
    }

    public static (int EstudianteId, string Nombre, double Distancia)? Mejor(
        float[] consulta,
        IEnumerable<(int Id, string Nombre, string Vector)> muestras)
    {
        var porEstudiante = new List<(int Id, string Nombre, double Distancia)>();
        foreach (var grupo in muestras.GroupBy(m => m.Id))
        {
            double mejor = double.MaxValue;
            foreach (var muestra in grupo)
            {
                var distancia = Distancia(consulta, Leer(muestra.Vector));
                if (distancia < mejor) mejor = distancia;
            }
            porEstudiante.Add((grupo.Key, grupo.First().Nombre, mejor));
        }

        var orden = porEstudiante.OrderBy(x => x.Distancia).ToList();
        if (orden.Count == 0 || orden[0].Distancia > Umbral)
            return null;
        if (orden.Count > 1 && orden[1].Distancia - orden[0].Distancia < Margen)
            return null;
        return orden[0];
    }

    public static byte[] FotoDesdeBase64(string? crudo)
    {
        var texto = (crudo ?? "").Trim();
        var coma = texto.IndexOf(',');
        if (texto.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && coma >= 0)
            texto = texto[(coma + 1)..];
        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(texto);
        }
        catch (FormatException)
        {
            throw new ArgumentException("La foto no se pudo leer.");
        }
        if (bytes.Length < 100 || bytes.Length > 1_500_000)
            throw new ArgumentException("La foto debe pesar menos de 1,5 MB.");
        var jpeg = bytes.Length > 2 && bytes[0] == 0xFF && bytes[1] == 0xD8;
        var png = bytes.Length > 4 && bytes[0] == 0x89 && bytes[1] == 0x50;
        if (!jpeg && !png)
            throw new ArgumentException("La foto debe ser JPG o PNG.");
        return bytes;
    }

    public static string TipoDe(byte[] bytes) =>
        bytes.Length > 2 && bytes[0] == 0xFF ? "image/jpeg" : "image/png";
}
