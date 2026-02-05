import { repository } from "@/lib/db";
import { GisDashboardData } from "@/lib/types/dashboard";

export class GisDataService {
  /**
   * Saves a new snapshot of the GIS state.
   */
  static async saveSnapshot(context: any): Promise<string> {
    return repository.saveSnapshot(context);
  }

  /**
   * Retrieves the latest GIS state snapshot.
   */
  static async getLatestSnapshot(): Promise<GisDashboardData | null> {
    return repository.getLatestSnapshot();
  }
}
