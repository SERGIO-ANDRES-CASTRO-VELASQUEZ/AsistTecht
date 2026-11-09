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

            // Dibujar Foto o Avatar Institucional
            if (estudiante.Foto is not null && estudiante.Foto.Length > 0)
            {
                try
                {
                    using var foto = Image.Load(estudiante.Foto);
                    foto.Mutate(f => f.Resize(new ResizeOptions
                    {
                        Size = new Size(250, 320),
                        Mode = ResizeMode.Crop,
                        Position = AnchorPositionMode.Top
                    }));
                    ctx.DrawImage(foto, new Point(40, 140), 1);
                }
                catch
                {
                    DibujarAvatarDefault(ctx, estudiante.Nombre, negrita, regular);
                }
            }
            else
            {
                DibujarAvatarDefault(ctx, estudiante.Nombre, negrita, regular);
            }

            // Datos del Estudiante
            ctx.DrawText(estudiante.Nombre, negrita, tinta, new PointF(330, 160));
            ctx.DrawText("Documento " + estudiante.Documento, regular, tinta, new PointF(330, 220));
            ctx.DrawText(estudiante.Grupo?.Nombre ?? "Sin grupo", regular, tinta, new PointF(330, 260));
            ctx.DrawText("AsisTecht · Carnet Digital 2026", negrita, verde, new PointF(330, 480));

            // Quiet-zone nítida y QR de alta resolución sin desenfoque
            ctx.Fill(Color.White, new RectangleF(715, 155, 250, 250));
            using var qr = Image.Load<Rgba32>(Qr(estudiante.QrToken));
            qr.Mutate(q => q.Resize(new ResizeOptions
            {
                Size = new Size(226, 226),
                Sampler = KnownResamplers.NearestNeighbor
            }));
            ctx.DrawImage(qr, new Point(727, 167), 1);
        });

        using var memoria = new MemoryStream();
        lienzo.SaveAsPng(memoria);
        return memoria.ToArray();
    }

    private static void DibujarAvatarDefault(IImageProcessingContext ctx, string nombre, Font negrita, Font regular)
    {
        var avatarBg = Color.ParseHex("132B23");
        ctx.Fill(avatarBg, new RectangleF(40, 140, 250, 320));
        var inicial = string.IsNullOrWhiteSpace(nombre) ? "E" : nombre.Trim()[0].ToString().ToUpper();
        ctx.DrawText(inicial, negrita, Color.ParseHex("10B981"), new PointF(150, 260));
        ctx.DrawText("ESTUDIANTE", regular, Color.ParseHex("9CA3AF"), new PointF(85, 410));
    }

    private static byte[] Qr(string token)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(token, QRCodeGenerator.ECCLevel.M);
        return new PngByteQRCode(data).GetGraphic(8);
    }

    private static (Font Regular, Font Negrita) Fuentes()
    {
        const string regularLinux = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf";
        const string negritaLinux = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf";
        const string regularWin = @"C:\Windows\Fonts\arial.ttf";
        const string negritaWin = @"C:\Windows\Fonts\arialbd.ttf";

        string reg = File.Exists(regularLinux) ? regularLinux : (File.Exists(regularWin) ? regularWin : "");
        string neg = File.Exists(negritaLinux) ? negritaLinux : (File.Exists(negritaWin) ? negritaWin : "");

        if (!string.IsNullOrEmpty(reg) && !string.IsNullOrEmpty(neg))
        {
            var coleccion = new FontCollection();
            var familia = coleccion.Add(reg);
            coleccion.Add(neg);
            return (familia.CreateFont(24), familia.CreateFont(32, FontStyle.Bold));
        }

        if (SystemFonts.Families.Any())
        {
            var fam = SystemFonts.Families.First();
            return (fam.CreateFont(24), fam.CreateFont(32, FontStyle.Bold));
        }

        throw new InvalidOperationException("Falta la fuente del carnet en el servidor.");
    }
}
