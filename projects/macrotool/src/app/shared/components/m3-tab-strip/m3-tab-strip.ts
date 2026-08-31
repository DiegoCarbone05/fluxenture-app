import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TabOption } from '../../models/TabOption';

/** Tira de pestañas M3 con indicador inferior de 3dp, en movil. */
@Component({
  selector: 'flux-m3-tab-strip',
  standalone: true,
  templateUrl: './m3-tab-strip.html',
  styleUrl: './m3-tab-strip.scss'
})
export class M3TabStrip {
  @Input() tabs: TabOption[] = [];
  @Input() selected: string = '';
  @Output() selectedChange = new EventEmitter<string>();
}
