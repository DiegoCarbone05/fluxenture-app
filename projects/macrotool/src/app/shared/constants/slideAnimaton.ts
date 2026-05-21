import { trigger, transition, style, query, animate, group } from '@angular/animations';
import { boxShadow } from 'html2canvas/dist/types/css/property-descriptors/box-shadow';

export const slideInAnimation = trigger('routeAnimations', [
    // Esta transición se dispara cuando cambias entre CUALQUIER ruta
    transition('* <=> *', [
        style({ position: 'relative' }),

        // Preparamos las dos páginas (la que entra y la que sale)
        query(':enter, :leave', [
            style({
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                boxShadow: '0 -5px 10px rgba(0, 0, 0, 0.1)'
                // opacity: 0 // Empezamos invisibles
            })
        ], { optional: true }),

        // La página que entra empieza desplazada a la derecha
        query(':enter', [
            style({ top: '2%', opacity: 1 })
        ], { optional: true }),

        // Ejecutamos las animaciones en paralelo con 'group'
        group([
            // La página vieja se va a la izquierda y desaparece
            query(':leave', [
                animate('400ms cubic-bezier(.08,.64,.28,.99)', style({ opacity: 0 }))
            ], { optional: true }),

            // La página nueva entra al centro y aparece
            query(':enter', [
                animate('400ms cubic-bezier(.08,.64,.28,.99)', style({ top: '0%', opacity: 1 }))
            ], { optional: true })
        ])
    ])
]);