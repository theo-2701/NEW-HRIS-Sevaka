/**
 * Balasan pintu persetujuan pola K9 (UIC-TIME 0.6 §1.2, `PROB-SERVICE-226` opsi A):
 * baris pada state SAAT pintu dipanggil — status belum berpindah — ditambah penanda
 * `decision_received: true`. Status final ditulis setelah pesan penyelesaian
 * workflow dikonsumsi (di mock: fungsi `complete*Workflow` masing-masing modul).
 */
export type DecisionAck<T> = T & { decisionReceived: true };

export const acknowledge = <T extends object>(row: T): DecisionAck<T> => ({ ...row, decisionReceived: true });
