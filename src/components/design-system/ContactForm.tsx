"use client";

import { useState } from "react";

interface ContactFormProps {
  whatsappUrl: string;
  /** Pre-filled message (e.g. the property query from a property page). */
  prefillMessage?: string;
}

export function ContactForm({ whatsappUrl, prefillMessage = "" }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: prefillMessage,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar el mensaje");
      }

      setStatus("success");
      setFormData({ name: "", phone: "", email: "", message: "" });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Error al enviar el mensaje");
    }
  };

  return (
    <div className="mt-10 rounded-xl border border-cream-line bg-surface p-6 md:p-8">
      <h2 className="text-center text-heading-md font-semibold text-ink">
        Escribinos por email
      </h2>
      <p className="mt-2 text-center text-body-sm text-body">
        Completá el formulario y te respondemos a la brevedad.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-body-sm font-medium text-ink">
            Nombre <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="mt-1 w-full rounded-sm border border-cream-line bg-canvas px-4 py-3 text-body-md text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-body-sm font-medium text-ink">
            Teléfono
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="mt-1 w-full rounded-sm border border-cream-line bg-canvas px-4 py-3 text-body-md text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="11 1234 5678"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-body-sm font-medium text-ink">
            Correo electrónico <span className="text-primary">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="mt-1 w-full rounded-sm border border-cream-line bg-canvas px-4 py-3 text-body-md text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-body-sm font-medium text-ink">
            Mensaje <span className="text-primary">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            value={formData.message}
            onChange={handleChange}
            className="mt-1 w-full resize-none rounded-sm border border-cream-line bg-canvas px-4 py-3 text-body-md text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="¿En qué podemos ayudarte?"
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-sm bg-primary px-6 py-3 text-button-md font-medium text-on-primary transition-colors hover:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Enviando..." : "Enviar mensaje"}
        </button>

        {status === "success" && (
          <p className="rounded-sm bg-green-50 p-3 text-center text-body-sm text-green-700">
            ¡Mensaje enviado! Te vamos a responder pronto.
          </p>
        )}

        {status === "error" && (
          <p className="rounded-sm bg-red-50 p-3 text-center text-body-sm text-red-700">
            {errorMessage || "Hubo un error al enviar el mensaje. Intentá de nuevo."}
          </p>
        )}
      </form>

      <div className="mt-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-cream-line" />
        <span className="text-body-sm text-muted">o</span>
        <div className="h-px flex-1 bg-cream-line" />
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex w-full items-center justify-center rounded-sm border border-ink bg-canvas px-6 py-3 text-button-md font-medium text-ink transition-colors hover:bg-surface-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        Enviar WhatsApp
      </a>
    </div>
  );
}
