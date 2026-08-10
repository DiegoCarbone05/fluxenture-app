import { Component, forwardRef, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'flux-input',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './text-input.html',
  styleUrl: './text-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInput),
      multi: true,
    },
  ],
})
export class TextInput implements ControlValueAccessor {
  @Input() placeholder = '';
  @Input() type: 'text' | 'email' | 'password' = 'text';
  @Input() autocomplete = 'off';
  @Input() error: string | null = null;

  value = signal('');
  disabled = signal(false);
  hidePassword = signal(true);

  private onChange: (value: string) => void = () => { };
  private onTouched: () => void = () => { };

  get inputType(): string {
    if (this.type !== 'password') return this.type;
    return this.hidePassword() ? 'password' : 'text';
  }

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  togglePasswordVisibility() {
    this.hidePassword.set(!this.hidePassword());
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  markTouched() {
    this.onTouched();
  }
}
