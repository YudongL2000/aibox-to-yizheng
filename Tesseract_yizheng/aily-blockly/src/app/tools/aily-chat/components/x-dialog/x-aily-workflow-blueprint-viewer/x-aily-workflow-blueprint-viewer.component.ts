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
  styles: [
    `
      .blueprint-card {
        padding: 14px 16px;
        border-radius: var(--radius-base);
        border: 1px solid
          color-mix(in srgb, var(--sem-success) 18%, var(--border-subtle));
        background: color-mix(
          in srgb,
          var(--sem-success) 8%,
          var(--surface-panel)
        );
      }
      .blueprint-card h4 {
        margin: 0 0 12px;
        color: var(--text-primary);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .label {
        margin: 0 0 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--sem-success);
        font-family: var(--font-mono);
      }
      ul {
        margin: 0;
        padding-left: 16px;
        color: var(--text-secondary);
      }
      .missing {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 12px;
        align-items: center;
      }
      code {
        padding: 2px 8px;
        border-radius: var(--radius-sm);
        background: color-mix(
          in srgb,
          var(--sem-warning) 10%,
          var(--surface-panel)
        );
        color: var(--sem-warning);
        font-family: var(--font-mono);
      }
      @media (max-width: 860px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class XAilyWorkflowBlueprintViewerComponent {
  @Input() data: any = null;
}
