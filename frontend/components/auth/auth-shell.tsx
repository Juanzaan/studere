import type { ReactNode } from "react";
import styles from "./auth.module.css";

/**
 * Brand column + card frame shared by sign-in and sign-up.
 * Ported from the studere-auth.html prototype.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.shell}>
        <aside className={styles.brand}>
          <a className={styles.wordmark} href="/">
            Studere
            <svg
              width="66"
              height="9"
              viewBox="0 0 70 10"
              style={{ marginLeft: 6 }}
              aria-hidden="true"
            >
              <path
                d="M2 7 Q 18 1, 35 6 T 68 4"
                stroke="#F2E6D4"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </a>

          <div className={styles.brandBody}>
            <div className={styles.eyebrow}>Trial · 7 días</div>
            <h1 className={styles.title}>
              De la clase al material.
              <br />
              <em>Sin reescribir todo.</em>
            </h1>
            <p className={styles.copy}>
              Subí audio, video o apuntes. Studere arma transcripción, flashcards, mapa y
              quiz listos para repasar.
            </p>
            <ul className={styles.list}>
              <li>Cancelás cuando quieras</li>
              <li>Tu material no se usa para entrenar modelos públicos</li>
              <li>Un plan, todo el kit</li>
            </ul>
          </div>

          <p className={styles.foot}>
            <a href="/">← Volver a la landing</a>
          </p>
        </aside>

        <main className={styles.panelCol}>
          <div className={styles.card}>{children}</div>
        </main>
      </div>
    </div>
  );
}
