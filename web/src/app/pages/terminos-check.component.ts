import { Component, ElementRef, ViewChild, model, signal } from '@angular/core';

@Component({
  selector: 'app-terminos-check',
  template: `
    <div style="grid-column: 1 / -1; margin-top: 0.25rem;">
      <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;">
        <input
          type="checkbox"
          [checked]="aceptado()"
          (change)="aceptado.set($any($event.target).checked)"
          style="width: auto; margin: 0;"
        />
        <span>
          Acepto
          <a href="#" (click)="abrir($event)" style="color: var(--primary); font-weight: 700; text-decoration: underline;">términos y condiciones</a>
        </span>
      </label>
    </div>

    @if (visible()) {
      <div #modalRef class="modal-backdrop" (click)="visible.set(false)">
        <div class="modal-card" (click)="$event.stopPropagation()" style="max-width: 44rem; text-align: left;">
          <h2 style="font-size: 1.2rem; margin-bottom: 1rem;">Términos y Condiciones y Autorización de Tratamiento de Datos Personales</h2>

          <h3 style="font-size: 1rem; margin: 0.9rem 0 0.25rem;">1. Responsable</h3>
          <p>Gimnasio José Eustasio Rivera, C.C 26.559.048, Calle 2 # 6 - 34 Rivera, Huila. Correo: gimnasiojoseustaciorivera&#64;gmail.com Teléfono: 3167593706.</p>

          <h3 style="font-size: 1rem; margin: 0.9rem 0 0.25rem;">2. Datos que se solicitan en el registro</h3>
          <p>Al crear un nuevo registro en AsisTecht, se solicitan los siguientes datos:</p>
          <ul style="padding-left: 1.25rem; margin: 0.25rem 0;">
            <li>Nombre completo.</li>
            <li>Número de documento de identidad (cédula, tarjeta de identidad u otro documento).</li>
            <li>Rostro (dato biométrico): la cámara capta el rostro y el sistema lo convierte en una plantilla numérica. No se guardan fotografías ni video.</li>
          </ul>
          <p>El rostro es un dato biométrico y, según la Ley 1581 de 2012, es un dato sensible. Su entrega es voluntaria: usted no está obligado a autorizarlo y no hacerlo no genera consecuencia académica ni disciplinaria. En ese caso, la asistencia se registrará por código QR o de forma manual.</p>

          <h3 style="font-size: 1rem; margin: 0.9rem 0 0.25rem;">3. Finalidad</h3>
          <p>Los datos se usarán únicamente para identificar a la persona y registrar y consultar su asistencia. No se usarán con fines comerciales, no se venderán ni se compartirán con terceros, salvo que una autoridad competente lo exija.</p>

          <h3 style="font-size: 1rem; margin: 0.9rem 0 0.25rem;">4. Menores de edad</h3>
          <p>Si el titular es menor de 18 años, la autorización debe otorgarla su padre, madre, tutor o representante legal, quien declara que los datos son veraces. Se tendrá en cuenta la opinión del menor según su madurez.</p>

          <h3 style="font-size: 1rem; margin: 0.9rem 0 0.25rem;">5. Tiempo de conservación</h3>
          <p>La ley no fija un número de días o meses para eliminar los datos. Lo que exige es que se conserven únicamente por el tiempo necesario y razonable para cumplir la finalidad para la cual fueron recolectados. Por eso, sus datos se conservarán mientras sean necesarios para el registro de asistencia y se eliminarán cuando esa finalidad termine (por ejemplo, cuando la persona se retire de la institución), salvo que una norma exija conservarlos por más tiempo. Los datos biométricos se eliminarán de inmediato si usted revoca su autorización.</p>

          <h3 style="font-size: 1rem; margin: 0.9rem 0 0.25rem;">6. Sus derechos</h3>
          <p>Usted puede conocer, actualizar y rectificar sus datos; solicitar prueba de la autorización; ser informado del uso que se les da; revocar la autorización y pedir la supresión de sus datos; y presentar quejas ante la Superintendencia de Industria y Comercio (SIC). Las consultas se responden en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles.</p>

          <h3 style="font-size: 1rem; margin: 0.9rem 0 0.25rem;">7. Seguridad</h3>
          <p>Los datos se protegen con conexión cifrada, control de acceso por roles y cifrado de la plantilla facial. Solo el personal autorizado puede consultarlos.</p>

          <h3 style="font-size: 1rem; margin: 0.9rem 0 0.25rem;">8. Marco legal</h3>
          <p>Constitución Política de Colombia (art. 15), Ley Estatutaria 1581 de 2012, Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y Ley 1098 de 2006.</p>

          <h3 style="font-size: 1rem; margin: 0.9rem 0 0.25rem;">9. Aceptación</h3>
          <p>He leído y acepto los Términos y Condiciones y autorizo el tratamiento de mi nombre y número de documento (o los del menor que represento) para el registro de asistencia.</p>
          <p>Autorizo el tratamiento de mi rostro como dato biométrico, únicamente para el registro de asistencia. Entiendo que es voluntario y que puedo revocar esta autorización en cualquier momento.</p>

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.25rem;">
            <button type="button" class="btn-secundario" (click)="visible.set(false)">Cerrar</button>
            <button type="button" class="btn-principal" (click)="aceptar()">Acepto</button>
          </div>
        </div>
      </div>
    }
  `
})
export class TerminosCheckComponent {
  aceptado = model(false);
  visible = signal(false);

  // El modal se mueve al body: las tarjetas con backdrop-filter atrapan los elementos fixed.
  @ViewChild('modalRef') set modalRef(ref: ElementRef<HTMLElement> | undefined) {
    if (ref) document.body.appendChild(ref.nativeElement);
  }

  abrir(ev: Event): void {
    ev.preventDefault();
    this.visible.set(true);
  }

  aceptar(): void {
    this.aceptado.set(true);
    this.visible.set(false);
  }
}
