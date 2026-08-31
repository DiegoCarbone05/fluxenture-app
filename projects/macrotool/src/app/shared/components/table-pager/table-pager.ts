import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Pie de paginación de la tarjeta-tabla, en escritorio. */
@Component({
  selector: 'flux-pager',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './table-pager.html',
  styleUrl: './table-pager.scss'
})
export class TablePager {
  @Input() currentPage: number = 0;
  @Input() totalPages: number = 1;
  @Input() pageNumbers: number[] = [];
  @Input() rangeLabel: string = '';
  @Output() pageChange = new EventEmitter<number>();
}
