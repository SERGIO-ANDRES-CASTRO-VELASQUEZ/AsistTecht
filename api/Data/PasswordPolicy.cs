namespace AsisQR.Api.Data;

public static class PasswordPolicy
{
    public const int MinLength = 8;

    public static (bool EsValida, string? Mensaje) Validar(string? password)
    {
        var p = (password ?? "").Trim();
        if (string.IsNullOrEmpty(p))
            return (false, "La contraseña no puede estar vacía.");

        if (p.Length < MinLength)
            return (false, $"La contraseña debe tener al menos {MinLength} caracteres.");

        if (!p.Any(char.IsUpper))
            return (false, "La contraseña debe incluir al menos una letra mayúscula (A-Z).");

        if (!p.Any(char.IsLower))
            return (false, "La contraseña debe incluir al menos una letra minúscula (a-z).");

        if (!p.Any(char.IsDigit))
            return (false, "La contraseña debe incluir al menos un número (0-9).");

        if (!p.Any(ch => !char.IsLetterOrDigit(ch)))
            return (false, "La contraseña debe incluir al menos un carácter especial (!@#$%^&*...).");

        return (true, null);
    }

    public static string GenerarClaveDinamica()
    {
        // Genera una contraseña segura y fácil de dictar que cumple estrictamente la política
        const string uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lowers = "abcdefghijkmnpqrstuvwxyz";
        const string digits = "23456789";
        const string symbols = "!@#$%&*";

        var rnd = System.Security.Cryptography.RandomNumberGenerator.Create();
        byte[] bytes = new byte[8];
        rnd.GetBytes(bytes);

        char u1 = uppers[bytes[0] % uppers.Length];
        char l1 = lowers[bytes[1] % lowers.Length];
        char d1 = digits[bytes[2] % digits.Length];
        char s = symbols[bytes[3] % symbols.Length];
        char u2 = uppers[bytes[4] % uppers.Length];
        char l2 = lowers[bytes[5] % lowers.Length];
        char d2 = digits[bytes[6] % digits.Length];
        char l3 = lowers[bytes[7] % lowers.Length];

        return $"Est-{u1}{l1}{d1}{s}{u2}{l2}{d2}{l3}";
    }
}
