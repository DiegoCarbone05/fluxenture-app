import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TabOption } from '../../models/TabOption';

/** Tira de pestañas pill dentro de una tarjeta-tabla, en escritorio. */
@Component({
  selector: 'flux-tab-strip',
  standalone: true,
  templateUrl: './tab-strip.html',
  styleUrl: './tab-strip.scss'
})
export class TabStrip {
  @Input() tabs: TabOption[] = [];
  @Input() selected: string = '';
  @Output() selectedChange = new EventEmitter<string>();
}
