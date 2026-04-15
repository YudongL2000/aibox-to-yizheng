import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'x-aily-workflow-blueprint-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="blueprint-card">
      <h4>{{ data?.intentSummary || 'Workflow Blueprint' }}</h4>

      <div class="grid">
        <section>
          <p class="label">Triggers</p>
          <ul>
            @for (item of data?.triggers || []; track $index) {
              <li>{{ item.type }}</li>
            }
          </ul>
        </section>

        <section>
          <p class="label">Logic</p>
          <ul>
            @for (item of data?.logic || []; track $index) {
              <li>{{ item.type }}</li>
            }
          </ul>
        </section>

        <section>
          <p class="label">Executors</p>
          <ul>
            @for (item of data?.executors || []; track $index) {
              <li>{{ item.type }}</li>
            }
          </ul>
        </section>
      </div>

      @if (data?.missingFields?.length) {
        <div class="missing">
          <span>Missing:</span>
          @for (field of data.missingFields; track field) {
            <code>{{ field }}</code>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .blueprint-card {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(13, 110, 82, 0.16);
      background: linear-gradient(180deg, rgba(244, 250, 247, 0.96), rgba(233, 244, 239, 0.92));
    }
    .blueprint-card h4 { margin: 0 0 12px; color: #16352f; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .label { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #5d786f; }
    ul { margin: 0; padding-left: 16px; color: #244740; }
    .missing { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; align-items: center; }
    code { padding: 2px 8px; border-radius: 999px; background: rgba(20, 64, 53, 0.08); }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class XAilyWorkflowBlueprintViewerComponent {
  @Input() data: any = null;
}
