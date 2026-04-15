/**
 * [INPUT]: 依赖 renderer 内部的日志写入需求与结构化日志消费方。
 * [OUTPUT]: 对外提供 LogService 与 LogOptions，作为日志列表与底部日志窗口之间的单一状态源。
 * [POS]: services 层的运行日志真相源，被工具面板与硬件 runtime service 共同写入。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  list: LogOptions[] = [];

  stateSubject = new Subject<LogOptions>();

  constructor() { }

  /**
   * 使用提供的选项更新日志状态。
   * @param opts - 要更新和发送的日志选项。
   */
  update(opts: LogOptions): LogOptions {
    const entry = {
      ...opts,
      timestamp: Date.now(),
    };
    this.list.push(entry);
    this.stateSubject.next(entry);
    return entry;
  }

  clear() {
    this.list = [];
  }
}

export interface LogOptions {
  id?: number;
  title?: string;
  detail?: string;
  state?: string;
  timestamp?: number;
  source?: string;
  context?: any;
}
