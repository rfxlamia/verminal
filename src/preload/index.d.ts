import { ElectronAPI } from '@electron-toolkit/preload'
import { IpcContract } from '../shared/ipc-contract'

declare global {
  interface Window {
    electron: ElectronAPI
    api: IpcContract
  }
}
