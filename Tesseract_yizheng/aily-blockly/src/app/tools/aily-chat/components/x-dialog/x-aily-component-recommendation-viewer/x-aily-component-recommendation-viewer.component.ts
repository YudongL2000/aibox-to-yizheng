import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'x-aily-component-recommendation-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="component-card">
      <div class="headline">
        <h4>Recommended Components</h4>
        <span>Topology: {{ data?.topology || 'n/a' }}</span>
      </div>

      <div class="groups">
        @for (group of groups; track group.key) {
          <section>
            <p>{{ group.label }}</p>
            <div class="chips">
              @for (item of asArray(data?.[group.key]); track item) {
                <span>{{ item }}</span>
              }
            </div>
          </section>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .component-card {
        padding: 14px 16px;
        border-radius: var(--radius-base);
        border: 1px solid
          color-mix(in srgb, var(--sem-info) 18%, var(--border-subtle));
        background: color-mix(
          in srgb,
          var(--sem-info) 8%,
          var(--surface-panel)
        );
      }
      .headline {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: baseline;
        margin-bottom: 10px;
      }
      .headline h4 {
        margin: 0;
        color: var(--text-primary);
      }
      .headline span {
        color: var(--text-muted);
        font-size: 12px;
        font-family: var(--font-mono);
      }
      .groups {
        display: grid;
        gap: 10px;
      }
      section p {
        margin: 0 0 6px;
        color: var(--sem-info);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-family: var(--font-mono);
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .chips span {
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        background: color-mix(
          in srgb,
          var(--sem-info) 10%,
          var(--surface-panel)
        );
        border: 1px solid color-mix(in srgb, var(--sem-info) 18%, transparent);
        color: var(--text-primary);
      }
    `,
  ],
})
export class XAilyComponentRecommendationViewerComponent {
  @Input() data: any = null;

  groups = [
    { key: 'inputs', label: 'Inputs' },
    { key: 'processes', label: 'Processes' },
    { key: 'decisions', label: 'Decisions' },
    { key: 'outputs', label: 'Outputs' },
    { key: 'componentAssembly', label: 'Assembly' },
  ];

  asArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)) : [];
  }
}
