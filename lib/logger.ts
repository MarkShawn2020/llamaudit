/**
 * 全局日志服务
 * 
 * 统一的日志记录工具，支持多级别日志，以及在不同环境下的不同行为
 */

// 日志级别定义
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// 日志条目接口
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

// 日志格式化函数类型
type LogFormatter = (entry: LogEntry) => string;

/**
 * 默认的日志格式化函数
 * 生成格式为 [时间] [级别] 消息 { 数据 } 的日志字符串
 */
const defaultFormatter: LogFormatter = (entry: LogEntry): string => {
  const { timestamp, level, message, data } = entry;
  
  // 根据级别设置不同的前缀样式
  let levelPrefix = `[${level.toUpperCase()}]`;
  
  // 格式化日志数据部分
  const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';
  
  return `[${timestamp}] ${levelPrefix} ${message}${dataStr}`;
};

// 简单的日志管理器类
class Logger {
  private formatter: LogFormatter;
  private minLevel: LogLevel;
  private logHistory: LogEntry[] = [];
  private maxHistorySize: number = 100; // 最大保存的日志条目数

  constructor(formatter: LogFormatter = defaultFormatter, minLevel: LogLevel = LogLevel.DEBUG) {
    this.formatter = formatter;
    this.minLevel = minLevel;
  }

  /**
   * 创建一条日志条目并处理
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // 检查是否达到最小日志级别
    const levelPriority = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };

    if (levelPriority[level] < levelPriority[this.minLevel]) {
      return;
    }

    // 创建日志条目
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    // 存储到历史记录
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift(); // 移除最旧的日志
    }

    // 格式化并输出日志
    const formattedLog = this.formatter(entry);
    
    // 根据环境和级别决定如何输出
    if (typeof window === 'undefined') {
      // 服务器端环境
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedLog);
          break;
        case LogLevel.WARN:
          console.warn(formattedLog);
          break;
        case LogLevel.INFO:
          console.info(formattedLog);
          break;
        default:
          console.log(formattedLog);
      }
    } else {
      // 浏览器环境
      // 生产环境下不输出 DEBUG 级别日志
      if (process.env.NODE_ENV === 'production' && level === LogLevel.DEBUG) {
        return;
      }
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedLog);
          break;
        case LogLevel.WARN:
          console.warn(formattedLog);
          break;
        case LogLevel.INFO:
          console.info(formattedLog);
          break;
        default:
          console.log(formattedLog);
      }
    }
  }

  /**
   * 记录调试级别日志
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * 记录信息级别日志
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 记录警告级别日志
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * 记录错误级别日志
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * 获取最近的日志历史
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * 清除日志历史
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * 修改最小日志级别
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// 创建全局单例日志实例
export const logger = new Logger(
  defaultFormatter,
  process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
);
