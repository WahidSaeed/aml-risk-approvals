'use server';
import API_BASE_URL from '../util/common';

// 1. Fetch live queue via API Gateway HTTP GET
export async function getPendingTransactions() {
  try {
    const response = await fetch(API_BASE_URL + '/cases', {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      // Prevent Next.js caching so you get fresh real-time data on reload
      cache: 'no-store' 
    });

    if (!response.ok) throw new Error("API failed to fetch active queue.");
    
    return await response.json();
  } catch (error) {
    console.error("Dashboard table load failure:", error);
    return [];
  }
}

// 2. Dispatch decision payload via API Gateway HTTP POST
export async function submitApproval(transactionId:String, taskToken:String, decision:String, notes:String) {
  try {
    const response = await fetch(API_BASE_URL + '/resolve', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_id: transactionId,
        task_token: taskToken,
        human_decision: decision,
        decision_note: notes
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || "API processing failure.");
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("API Gateway communication network fault:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}