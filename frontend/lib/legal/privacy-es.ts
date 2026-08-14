import type { LegalDoc } from "./types";

export const privacyEs: LegalDoc = {
  lang: "es",
  title: "Política de Privacidad",
  updatedLabel: "Última actualización",
  updated: "2026-08-14",
  intro:
    "Esta Política explica qué datos se tratan al usar Studere, dónde se guardan, con quién se comparten y qué derechos tenés. Se rige por la Ley N.º 18.331 de Protección de Datos Personales de Uruguay, su Decreto Reglamentario 414/009 y las normas complementarias.",
  sections: [
    {
      id: "controller",
      heading: "1. Responsable del tratamiento",
      paragraphs: [
        "El responsable del tratamiento es [nombre o razón social del titular], con domicilio en [ciudad], Uruguay, y contacto en [email de contacto].",
      ],
    },
    {
      id: "data-processed",
      heading: "2. Qué datos se tratan",
      paragraphs: ["Tratamos las siguientes categorías de datos:"],
      list: [
        "Datos de cuenta: email, nombre y método de autenticación, provistos a través de Clerk.",
        "Contenido de estudio: grabaciones de audio, transcripciones, notas e imágenes que el Usuario sube, procesadas transitoriamente para generar el material de estudio.",
        "Estadísticas de estudio: intentos de quizzes y flashcards, almacenados únicamente en el dispositivo del Usuario.",
        "Datos de pago: se procesan exclusivamente a través del procesador de pagos; no recibimos ni almacenamos datos de tarjetas.",
      ],
      afterList: [
        "No utilizamos analytics de terceros, ni píxeles de seguimiento, ni vendemos ni compartimos datos personales con fines publicitarios.",
      ],
    },
    {
      id: "storage",
      heading: "3. Dónde se guardan los datos",
      paragraphs: [
        "La aplicación es local-first: los datos de estudio se guardan en el almacenamiento local del navegador del Usuario (localStorage) y no se suben a servidores de Studere, salvo lo necesario para el procesamiento con IA.",
        "El audio, la transcripción y las imágenes se envían de forma transitoria a Azure OpenAI (Microsoft) para su procesamiento y no se almacenan de forma persistente como parte del Servicio.",
        "Los datos de la cuenta se gestionan por Clerk, que actúa como encargado del tratamiento.",
      ],
    },
    {
      id: "processors",
      heading: "4. Encargados del tratamiento",
      paragraphs: ["Utilizamos los siguientes encargados:"],
      list: [
        "Clerk (autenticación y datos de cuenta).",
        "Microsoft Azure OpenAI (transcripción y generación de contenido con IA).",
        "[Nombre del procesador de pagos, a definir] (facturación de suscripciones).",
      ],
    },
    {
      id: "cookies",
      heading: "5. Cookies y tecnologías similares",
      paragraphs: [
        "La aplicación no utiliza cookies de seguimiento ni de terceros. Clerk puede emitir cookies técnicas necesarias para mantener la sesión de autenticación. El almacenamiento local (localStorage) no se utiliza para rastrear al Usuario fuera del sitio.",
      ],
    },
    {
      id: "rights",
      heading: "6. Derechos del Usuario (ARCO)",
      paragraphs: [
        "La Ley N.º 18.331 reconoce al Usuario los derechos de acceso, rectificación, cancelación (supresión) y oposición respecto de sus datos personales. El Usuario puede ejercerlos escribiendo a [email de contacto], identificándose debidamente.",
        "Responderemos dentro de los plazos legales. Si considerás que el tratamiento vulnera tus derechos, podés presentar una denuncia ante la Unidad Reguladora y de Control de Datos Personales (URCDP).",
      ],
    },
    {
      id: "retention",
      heading: "7. Conservación de los datos",
      paragraphs: [
        "Los datos de estudio permanecen en el dispositivo del Usuario hasta que este los elimine o borre los datos del navegador. El contenido enviado para procesamiento con IA se conserva solo el tiempo necesario para completar el procesamiento, y el caché del backend es transitorio y con contenido direccionado (no contiene identidad del Usuario).",
        "Los datos de cuenta se conservan mientras la cuenta esté activa y se eliminan cuando el Usuario la cancela, conforme a los plazos de Clerk.",
      ],
    },
    {
      id: "transfers",
      heading: "8. Transferencias internacionales",
      paragraphs: [
        "Los encargados del tratamiento pueden operar fuera de Uruguay (por ejemplo, Clerk y Microsoft Azure). Uruguay cuenta con reconocimiento de nivel adecuado de protección de datos por parte de la Unión Europea, y estos encargados ofrecen garantías contractuales y técnicas equivalentes para la transferencia de datos.",
      ],
    },
    {
      id: "security",
      heading: "9. Seguridad",
      paragraphs: [
        "Aplicamos medidas técnicas y organizativas apropiadas: cifrado en tránsito (HTTPS), verificación de tokens de autenticación y minimización de datos. Dado que los datos principales viven en el dispositivo del Usuario, recomendamos mantener el navegador y el sistema operativo actualizados.",
      ],
    },
    {
      id: "minors",
      heading: "10. Menores",
      paragraphs: [
        "El Servicio está dirigido a personas mayores de 18 años. Los menores de 18 solo pueden usarlo bajo supervisión de un adulto responsable.",
      ],
    },
    {
      id: "changes",
      heading: "11. Modificaciones",
      paragraphs: [
        "Esta Política puede actualizarse para reflejar cambios en el Servicio o en la normativa. Los cambios se publicarán en esta página con la fecha de actualización.",
      ],
    },
    {
      id: "contact",
      heading: "12. Contacto",
      paragraphs: [
        "Consultas sobre privacidad: [email de contacto]. Reclamos: URCDP, urcdp.gub.uy.",
      ],
    },
  ],
};