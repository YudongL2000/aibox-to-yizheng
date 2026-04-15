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
  styles: [`
    .component-card {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(33, 69, 112, 0.14);
      background: linear-gradient(180deg, rgba(248, 250, 255, 0.98), rgba(239, 244, 251, 0.94));
    }
    .headline {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
      margin-bottom: 10px;
    }
    .headline h4 { margin: 0; color: #193250; }
    .headline span { color: #59718f; font-size: 12px; }
    .groups { display: grid; gap: 10px; }
    section p { margin: 0 0 6px; color: #4f6784; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chips span {
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(25, 50, 80, 0.08);
      color: #193250;
    }
  `],
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
