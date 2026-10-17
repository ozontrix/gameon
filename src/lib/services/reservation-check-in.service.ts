import { performCheckIn, type CheckInContext } from './check-in-operation';

/** App, WhatsApp, camera and keyboard scans share one atomic admission path. */
export class ReservationCheckInService {
  static verify(code: string, context: CheckInContext) {
    return performCheckIn(code, context);
  }
}