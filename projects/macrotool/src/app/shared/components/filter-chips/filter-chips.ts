import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface FilterChipOption {
  key: string;
  label: string;
}

/** Fila de filter chips M3 (Todos/Operativos/Inactivos, etc), en movil. */
@Component({
  selector: 'flux-filter-chips',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './filter-chips.html',
  styleUrl: './filter-chips.scss'
})
export class FilterChips {
  @Input() chips: FilterChipOption[] = [];
  @Input() selected: string = '';
  @Output() selectedChange = new EventEmitter<string>();
}
