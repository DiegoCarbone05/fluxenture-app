import { Injectable, Signal, signal } from '@angular/core';
import { EmployeeDraft } from '../../shared/models/EmployeeDraft';

const STORAGE_KEY = 'flux_employee_drafts';

@Injectable({
  providedIn: 'root'
})
export class EmployeeDraftService {
  private draftsSignal = signal<EmployeeDraft[]>(this.load());

  getDraftsSignal(): Signal<EmployeeDraft[]> {
    return this.draftsSignal.asReadonly();
  }

  getById(id: string): EmployeeDraft | undefined {
    return this.draftsSignal().find(draft => draft.id === id);
  }

  save(id: string | undefined, formValue: Record<string, any>): EmployeeDraft {
    const draft: EmployeeDraft = {
      id: id ?? this.generateId(),
      updatedAt: new Date().toISOString(),
      formValue,
    };
    const current = this.draftsSignal();
    const idx = current.findIndex(d => d.id === draft.id);
    const next = idx >= 0
      ? current.map((d, i) => i === idx ? draft : d)
      : [...current, draft];
    this.persist(next);
    return draft;
  }

  remove(id: string): void {
    this.persist(this.draftsSignal().filter(d => d.id !== id));
  }

  private generateId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private load(): EmployeeDraft[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as EmployeeDraft[] : [];
    } catch {
      return [];
    }
  }

  private persist(drafts: EmployeeDraft[]): void {
    this.draftsSignal.set(drafts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  }
}
