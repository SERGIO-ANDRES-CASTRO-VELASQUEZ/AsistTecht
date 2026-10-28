using System.Text;
using AsisQR.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;

var builder = WebApplication.CreateBuilder(args);

var jwtKey = builder.Configuration["Jwt:Key"] ?? "";
if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key debe tener al menos 32 caracteres.");

// Pool de DbContext optimizado para soportar 1000+ conexiones simultáneas sin saturar memoria
builder.Services.AddDbContextPool<AppDb>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")), poolSize: 128);

builder.Services.AddMemoryCache();
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

// Control de tráfico y mitigación de sobrecarga para soportar 1000+ usuarios concurrentes
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync("{\"mensaje\":\"Demasiadas peticiones simultáneas. Por favor espera unos segundos.\"}");
    };

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        return RateLimitPartition.GetConcurrencyLimiter(
            partitionKey: "global_concurrency",
            factory: _ => new ConcurrencyLimiterOptions
            {
                PermitLimit = 1000,
                QueueLimit = 1000,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            });
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", policy => policy.RequireRole("Admin"));
    options.AddPolicy("Profesor", policy => policy.RequireRole("Profesor"));
    options.AddPolicy("Estudiante", policy => policy.RequireRole("Estudiante"));
    options.AddPolicy("Director", policy => policy.RequireRole("Director"));
    options.AddPolicy("Acudiente", policy => policy.RequireRole("Acudiente"));
    options.AddPolicy("AdminODirector", policy => policy.RequireRole("Admin", "Director"));
});

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    for (var intento = 1; intento <= 20; intento++)
    {
        try
        {
            db.Database.EnsureCreated();
            Esquema.Aplicar(db);
            DbSeeder.Seed(db);
            break;
        }
        catch (Exception ex) when (intento < 20)
        {
            app.Logger.LogWarning(ex, "La base todavía no responde. Intento {Intento}.", intento);
            Thread.Sleep(TimeSpan.FromSeconds(2));
        }
    }
}

app.UseResponseCompression();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/salud", () => Results.Ok(new { estado = "ok", servicio = "AsisTecht" }));

app.Run();
