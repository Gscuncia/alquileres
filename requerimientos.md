# DOCUMENTO DE REQUERIMIENTOS FUNCIONALES (FRD)
## Nombre de la Plataforma: Alquileres Anita
### Dominio Oficial: alquileresanita.com.ar

---

## 1. DESCRIPCIÓN GENERAL Y ARQUITECTURA DE LA PLATAFORMA
1.1. **Propósito del Sistema:**
    - Desarrollar una plataforma web híbrida para la gestión comercial y operativa del complejo de alquileres temporarios "Alquileres Anita", ubicado en un mismo predio en la Costa Atlántica (compuesto por 6 departamentos y 1 chalet).
    - Dividir la aplicación en dos grandes entornos: un **Portal Público** de presentación comercial y un **Panel Privado** de gestión interna.

1.2. **Portal Público (Estilo Airbnb):**
    - **Página de Inicio y Catálogo:** Presentación visual atractiva del complejo, destacando las comodidades, ubicación general en la Costa Atlántica y galería de fotos institucional.
    - **Catálogo de Unidades:** Detalle y carrusel fotográfico de las **7 unidades operativas** (Departamento 1 al 6 y el Chalet).
    - **Buscador y Filtros Básicos:** Filtros visuales por características de las unidades (capacidad de pasajeros, si acepta vehículo, etc.). 
    - **Restricción de Disponibilidad:** El portal público *no* incluirá motor de reservas ni consulta de disponibilidad de agenda en tiempo real. Los clientes interesados deberán coordinar la contratación vía telefónica.
    - **Formulario de Contacto y Consultas:**
        - Campos obligatorios y opcionales: Nombre y apellido, teléfono de contacto, correo electrónico, fechas estimadas de interés (opcional) y cuadro de texto libre para la consulta.
        - **Acción automática de envío:** Al completarse y enviarse el formulario, el sistema disparará de forma simultánea:
            1. Un correo electrónico a la casilla de administración del complejo.
            2. Una alerta automática al bot de Telegram configurado para el equipo operativo.
    - **Acceso Privado:** Enlace o botón discreto en la interfaz pública para acceder al formulario de inicio de sesión (Login) de los administradores y personal autorizado.

---

## 2. MÓDULO DE AUTENTICACIÓN Y CONTROL DE ACCESOS (RBAC)
2.1. **Autenticación por Credenciales:**
    - Sistema seguro de inicio de sesión basado en usuario (correo electrónico) y contraseña cifrada.
    - Sesiones persistentes y protegidas mediante tokens de autenticación para evitar el ingreso no autorizado a las rutas del panel de gestión (`/admin/*`).

2.2. **Definición de Roles y Permisos:**
    - **Rol 1: Superadministrador (Administrador):**
        - Control total y absoluto sobre la plataforma.
        - Permisos para crear, modificar, actualizar y eliminar reservas y bloqueos de agenda.
        - Permisos para registrar, editar y auditar los gastos de mantenimiento (incluyendo la subida de comprobantes).
        - Gestión completa de altas, bajas y modificaciones de usuarios del sistema y sus credenciales.
    - **Rol 2: Usuario de Consulta / Operativo:**
        - Acceso de solo lectura a la grilla mensual de calendarios, el estado de ocupación de las 7 unidades y el listado financiero de gastos.
        - **Permisos especiales operativos:** Facultado exclusivamente para registrar el **Check-in** y el **Check-out** de los inquilinos, ingresando la fecha y la hora exacta en que se produce.
        - Restricción total: Imposibilidad estricta de crear, modificar o eliminar reservas, así como de alterar registros de gastos.

---

## 3. MÓDULO DE RESERVAS Y AGENDA INTERNA
3.1. **Gestión de la Agenda:**
    - Administrada de forma interna y exclusiva por los usuarios con privilegios en el panel privado, posterior a la coordinación telefónica con el cliente.

3.2. **Vistas de Calendario y Ocupación:**
    - **Grilla Mensual por Unidad:** Vista de calendario detallada individualmente por cada departamento y el chalet, marcando claramente los períodos libres y los períodos ocupados (bloqueados).
    - **Vista General Consolidada del Mes:** Panel resumen que permite visualizar el estado operativo de las 7 unidades en simultáneo durante el mes en curso.

3.3. **Formulario de Carga de Reserva:**
    - **Selección de Unidad:** Selector desplegable entre los 6 departamentos y el chalet.
    - **Datos del Inquilino:** Nombre y apellido, número de teléfono, correo electrónico.
    - **Control Temporal:** Fecha y hora de ingreso (Check-in) y fecha y hora de egreso (Check-out).
    - **Datos Económicos:** Monto de la seña abonada, monto total acordado o saldo pendiente, y moneda/método de pago.
    - **Observaciones y Detalles Particulares:** Campo de texto libre para registrar notas (ej. si ingresa o no con vehículo, cantidad de pasajeros, requerimientos especiales).

3.4. **Sistema de Alertas Automáticas (Telegram):**
    - **Nueva Reserva:** Disparo automático de una alerta al grupo/chat de Telegram del equipo cada vez que se carga y guarda una reserva en firme.
    - **Check-in:** Envío automático de notificación a Telegram al registrarse el ingreso efectivo de los inquilinos.
    - **Check-out:** Envío automático de notificación a Telegram al registrarse la salida efectiva de los inquilinos.

---

## 4. MÓDULO DE GASTOS Y MANTENIMIENTO
4.1. **Clasificación del Gasto:**
    - **Gasto General del Complejo:** Inversiones o reparaciones que afectan a las áreas comunes del predio.
    - **Gasto Puntual por Unidad:** Egresos económicos asociados de forma directa a un departamento o al chalet específico.

4.2. **Categorización Estándar:**
    - El sistema debe permitir clasificar cada egreso bajo un selector de categorías predefinidas:
        - Plomería
        - Electricidad
        - Mantenimiento general
        - Gas
        - Gastos civiles
        - Pintura
        - Otros

4.3. **Campos del Registro de Gastos:**
    - Monto monetario exacto del gasto.
    - Fecha en que se realizó la erogación.
    - Concepto / Descripción detallada de los trabajos o insumos adquiridos.

4.4. **Adjuntos de Comprobantes:**
    - Opción de adjuntar archivos multimedia al registro contable en formatos de imagen estándar (`.jpg`, `.png`) o documento digital (`.pdf`), simulando la carga de una foto de la factura o recibo.

---

## 5. STACK TECNOLÓGICO RECOMENDADO PARA EL DESARROLLO (OPEN CODE)
5.1. **Frontend (Portal Público y Panel de Gestión):**
    - **Framework:** Next.js (React con soporte para Server Actions y enrutamiento optimizado).
    - **Estilos y UI:** Tailwind CSS para un diseño limpio, moderno, responsive y adaptado a dispositivos móviles.

5.2. **Backend y Lógica de Negocio:**
    - **Arquitectura:** Rutas API integradas en Next.js (o Node.js / FastAPI en caso de requerir un servicio desacoplado).
    - **Servicios Externos:** Integración con API de Telegram (Bot SDK/Webhook) para notificaciones en tiempo real y servicio de correo electrónico (SMTP / Resend / SendGrid).

5.3. **Base de Datos y Almacenamiento:**
    - **Base de Datos Relacional:** PostgreSQL, ideal para asegurar la integridad referencial de las fechas de reservas, restricciones de solapamiento de agenda, control estricto de roles (RBAC) y registros contables.
    - **Almacenamiento de Archivos:** Almacenamiento en la nube (ej. Supabase Storage o AWS S3) para guardar de forma segura las fotos de los departamentos y los comprobantes/facturas de mantenimiento subidos por los administradores.