using QRCoder;
using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace AsisQR.Api.Data;

public static class CarnetDibujo
{
    public const string Institucion = "Gimnasio José Eustasio Rivera";

    public static byte[] Pintar(Estudiante estudiante)
    {
        if (estudiante.Foto is null || estudiante.Foto.Length == 0)
            throw new InvalidOperationException("Falta la foto.");

        using var lienzo = new Image<Rgba32>(1000, 580);
        var verde = Color.ParseHex("0E6B52");
        var papel = Color.ParseHex("FFFDF8");
        var tinta = Color.ParseHex("1C2420");
        var (regular, negrita) = Fuentes();

        lienzo.Mutate(ctx =>
        {
            ctx.Fill(verde);
            ctx.Fill(papel, new RectangleF(0, 92, 1000, 488));
            ctx.DrawText(Institucion, negrita, Color.White, new PointF(36, 30));

            using var foto = Image.Load(estudiante.Foto);
            foto.Mutate(f => f.Resize(new ResizeOptions
            {
                Size = new Size(250, 320),
                Mode = ResizeMode.Crop,
                Position = AnchorPositionMode.Top
            }));
            ctx.DrawImage(foto, new Point(40, 140), 1);

            ctx.DrawText(estudiante.Nombre, negrita, tinta, new PointF(330, 160));
            ctx.DrawText("Documento " + estudiante.Documento, regular, tinta, new PointF(330, 220));
            ctx.DrawText(estudiante.Grupo?.Nombre ?? "Sin grupo", regular, tinta, new PointF(330, 260));
            ctx.DrawText("AsisTecht", negrita, verde, new PointF(330, 480));

            using var qr = Image.Load<Rgba32>(Qr(estudiante.QrToken));
            qr.Mutate(q => q.Resize(210, 210));
            ctx.DrawImage(qr, new Point(740, 180), 1);
        });

        using var memoria = new MemoryStream();
        lienzo.SaveAsPng(memoria);
        return memoria.ToArray();
    }

    private static byte[] Qr(string token)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(token, QRCodeGenerator.ECCLevel.H);
        return new PngByteQRCode(data).GetGraphic(12);
    }

    private static (Font Regular, Font Negrita) Fuentes()
    {
        const string regular = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf";
        const string negrita = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf";
        if (!File.Exists(regular) || !File.Exists(negrita))
            throw new InvalidOperationException("Falta la fuente del carnet en el servidor.");
        var coleccion = new FontCollection();
        var familia = coleccion.Add(regular);
        coleccion.Add(negrita);
        return (familia.CreateFont(24), familia.CreateFont(32, FontStyle.Bold));
    }
}
