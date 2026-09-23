import { EventEmitter, Output } from '@angular/core';

export class Component {
  @Output() click = new EventEmitter<void>();
}
