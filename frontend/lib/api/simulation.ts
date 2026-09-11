import { CircuitSchema, SimulationResultSchema } from "../types/quantum";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export class SimulationApiError extends Error {
  statusCode: number;
  detail: string;

  constructor(message: string, statusCode: number, detail: string) {
    super(message);
    this.name = "SimulationApiError";
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

/**
 * Executes quantum circuit simulation via FastAPI backend and Qiskit Aer.
 * 
 * @param circuit - Standardized circuit schema payload
 * @returns Structured simulation results with counts and basis probabilities
 * @throws SimulationApiError on validation or execution failures
 */
export async function runSimulation(
  circuit: CircuitSchema
): Promise<SimulationResultSchema> {
  const url = `${BACKEND_BASE_URL}/api/simulation/run`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(circuit),
    });

    if (!response.ok) {
      let detail = `Simulation request failed with status ${response.status}`;
      try {
        const errorData = (await response.json()) as Record<string, unknown>;
        if (errorData && typeof errorData.detail === "string") {
          detail = errorData.detail;
        } else if (Array.isArray(errorData?.detail)) {
          detail = (errorData.detail as Array<{ msg?: string }>)
            .map((e) => e.msg || JSON.stringify(e))
            .join("; ");
        }
      } catch {
        // Response body was not JSON
      }
      throw new SimulationApiError(detail, response.status, detail);
    }

    const data: SimulationResultSchema = await response.json();
    return data;
  } catch (error: unknown) {
    if (error instanceof SimulationApiError) {
      throw error;
    }
    // Network connectivity error
    throw new SimulationApiError(
      "Quantum simulator is unavailable. Make sure the FastAPI server is running at http://localhost:8000.",
      0,
      "Backend connection error: please ensure FastAPI server is running on port 8000."
    );
  }
}

/**
 * Checks backend health status.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return data?.status === "ok";
    }
    return false;
  } catch {
    return false;
  }
}
