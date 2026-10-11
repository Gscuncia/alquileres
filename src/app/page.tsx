export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-section text-center">
      <h1 className="text-display-xl font-bold text-ink">
        Alquileres Anita
      </h1>
      <p className="mt-4 max-w-xl text-body-md text-muted">
        Próximamente: alquileres temporarios en la Costa Atlántica.
      </p>
      <a
        href="mailto:contacto@alquileresanita.com.ar"
        className="mt-lg inline-flex items-center justify-center rounded-sm bg-primary px-6 py-3.5 text-button-md font-medium text-on-primary transition-colors hover:bg-primary-active"
      >
        Contactanos
      </a>
    </main>
  );
}
