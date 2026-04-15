import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { ModelProjectService } from '../../services/model-project.service';

@Component({
  selector: 'app-save-project-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzInputModule,
    NzButtonModule
  ],
  host: {
    class: 'save-project-shell',
  },
  template: `
    <nz-modal [(nzVisible)]="visible" [nzTitle]="'保存项目'" [nzFooter]="modalFooter"
      [nzWidth]="400" (nzOnCancel)="handleCancel()" nzClassName="save-project-modal">
      <ng-template #modalFooter>
        <button nz-button nzType="default" (click)="handleCancel()">关闭</button>
        <button nz-button nzType="primary" (click)="handleSave()" [nzLoading]="saving">保存</button>
      </ng-template>
      <div *nzModalContent class="save-project-content">
        <div class="form-item">
          <label>项目名称</label>
          <input nz-input [(ngModel)]="projectName" placeholder="请输入项目名称" />
        </div>
        <div class="form-item">
          <label>保存路径</label>
          <nz-input-group [nzAddOnAfter]="folderIconTemplate">
            <input nz-input [(ngModel)]="projectPath" placeholder="选择项目保存路径" [disabled]="true" />
          </nz-input-group>
          <ng-template #folderIconTemplate>
            <div class="btn ccenter ffull" (click)="selectPath()">
              <i class="fa-light fa-folder"></i>
            </div>
          </ng-template>
        </div>
      </div>
    </nz-modal>
  `,
  styleUrls: ['./save-project-modal.component.scss'],
})
export class SaveProjectModalComponent implements OnInit {
  @Input() visible = false;
  @Input() projectName = '';
  @Input() projectPath = '';
  @Input() namePrefix = 'project_';
  
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() projectNameChange = new EventEmitter<string>();
  @Output() projectPathChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<{ name: string; path: string }>();
  @Output() cancel = new EventEmitter<void>();

  saving = false;

  constructor(private modelProjectService: ModelProjectService) {}

  ngOnInit() {
    // 如果没有设置默认路径，则获取默认路径
    if (!this.projectPath) {
      this.projectPath = this.modelProjectService.getDefaultSavePath();
      this.projectPathChange.emit(this.projectPath);
    }
    
    // 如果没有设置项目名称，则生成默认名称
    if (!this.projectName && this.projectPath) {
      this.projectName = this.modelProjectService.generateProjectName(this.projectPath, this.namePrefix);
      this.projectNameChange.emit(this.projectName);
    }
  }

  async selectPath() {
    const newPath = await this.modelProjectService.selectSavePath(this.projectPath);
    if (newPath) {
      this.projectPath = newPath;
      this.projectPathChange.emit(this.projectPath);
    }
  }

  handleCancel() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.cancel.emit();
  }

  handleSave() {
    if (!this.projectName.trim()) {
      return;
    }
    
    this.save.emit({
      name: this.projectName,
      path: this.projectPath
    });
  }

  setSaving(value: boolean) {
    this.saving = value;
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
