using Microsoft.EntityFrameworkCore;

namespace AsisQR.Api.Data;

public class AppDb : DbContext
{
    public AppDb(DbContextOptions<AppDb> options) : base(options) { }

    public DbSet<Profesor> Profesores => Set<Profesor>();
    public DbSet<Estudiante> Estudiantes => Set<Estudiante>();
    public DbSet<Materia> Materias => Set<Materia>();
    public DbSet<Grupo> Grupos => Set<Grupo>();
    public DbSet<MateriaGrupo> MateriaGrupos => Set<MateriaGrupo>();
    public DbSet<Sesion> Sesiones => Set<Sesion>();
    public DbSet<Asistencia> Asistencias => Set<Asistencia>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Profesor>().HasIndex(p => p.Usuario).IsUnique();
        modelBuilder.Entity<Profesor>().Property(p => p.Nombre).HasMaxLength(120);
        modelBuilder.Entity<Profesor>().Property(p => p.Usuario).HasMaxLength(40);

        modelBuilder.Entity<Estudiante>().HasIndex(e => e.Documento).IsUnique();
        modelBuilder.Entity<Estudiante>().HasIndex(e => e.QrToken).IsUnique();
        modelBuilder.Entity<Estudiante>().Property(e => e.Nombre).HasMaxLength(120);
        modelBuilder.Entity<Estudiante>().Property(e => e.Documento).HasMaxLength(20);
        modelBuilder.Entity<Estudiante>().Property(e => e.QrToken).HasMaxLength(40);
        modelBuilder.Entity<Estudiante>()
            .HasOne(e => e.Grupo)
            .WithMany(g => g.Estudiantes)
            .HasForeignKey(e => e.GrupoId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Materia>().Property(m => m.Nombre).HasMaxLength(120);
        modelBuilder.Entity<Materia>()
            .HasIndex(m => new { m.ProfesorId, m.Nombre }).IsUnique();

        modelBuilder.Entity<Grupo>().Property(g => g.Nombre).HasMaxLength(80);
        modelBuilder.Entity<Grupo>()
            .HasIndex(g => new { g.ProfesorId, g.Nombre }).IsUnique();

        modelBuilder.Entity<MateriaGrupo>().HasKey(x => new { x.MateriaId, x.GrupoId });
        modelBuilder.Entity<MateriaGrupo>()
            .HasOne(x => x.Materia)
            .WithMany(m => m.Grupos)
            .HasForeignKey(x => x.MateriaId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<MateriaGrupo>()
            .HasOne(x => x.Grupo)
            .WithMany(g => g.Materias)
            .HasForeignKey(x => x.GrupoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Sesion>()
            .HasIndex(s => new { s.MateriaId, s.GrupoId, s.Fecha }).IsUnique();
        modelBuilder.Entity<Sesion>()
            .HasOne(s => s.Materia)
            .WithMany()
            .HasForeignKey(s => s.MateriaId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Sesion>()
            .HasOne(s => s.Grupo)
            .WithMany()
            .HasForeignKey(s => s.GrupoId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Asistencia>()
            .HasIndex(a => new { a.SesionId, a.EstudianteId }).IsUnique();
        modelBuilder.Entity<Asistencia>()
            .HasOne(a => a.Sesion)
            .WithMany(s => s.Asistencias)
            .HasForeignKey(a => a.SesionId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Asistencia>()
            .HasOne(a => a.Estudiante)
            .WithMany()
            .HasForeignKey(a => a.EstudianteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
