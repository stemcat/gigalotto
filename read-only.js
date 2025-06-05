import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

// Contract details
import { contractAddress, abi as walletAbi } from "./wallet.js";
const abi = [
  "function totalPool() view returns (uint256)",
  "function getJackpotUsd() view returns (uint256)",
  "function TARGET_USD() view returns (uint256)",
  "function last24hDepositUsd() view returns (uint256)",
  "function getEntriesCount() view returns (uint256)",
  "function getEntry(uint256 index) view returns (address user, uint256 cumulative)",
  "function userDeposits(address user) view returns (uint256)",
  "function collectedFees() view returns (uint256)",
];

// Update the subgraph endpoint with your actual deployed subgraph URL
const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/113076/gigalottosepolia/version/latest";

// Improved subgraph debugging
export function debugSubgraphConnection() {
  console.log("=== SUBGRAPH CONNECTION DEBUGGING ===");
  console.log("Subgraph URL:", SUBGRAPH_URL);
  console.log("Contract address:", contractAddress);

  // Test basic connection to subgraph
  fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "{ _meta { block { number } } }" }),
  })
    .then((res) => {
      console.log("Subgraph connection status:", res.status);
      return res.json();
    })
    .then((result) => {
      console.log("Subgraph _meta response:", result);

      // Now try a specific query for our contract
      const contractQuery = `{
        contract(id: "${contractAddress.toLowerCase()}") {
          totalPool
        }
      }`;

      return fetch(SUBGRAPH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: contractQuery }),
      });
    })
    .then((res) => res.json())
    .then((result) => {
      console.log("Contract query response:", result);

      if (result.errors) {
        console.error("Subgraph errors:", result.errors);
      } else if (!result.data || !result.data.contract) {
        console.error(
          "No contract data found. Contract may not be indexed yet."
        );

        // Try direct contract call as fallback
        console.log("Trying direct contract call as fallback...");
        tryDirectContractCall(true); // true = debug mode
      } else {
        console.log("Subgraph connection successful!");
      }
    })
    .catch((err) => {
      console.error("Subgraph fetch error:", err);
      console.log("Trying direct contract call as fallback...");
      tryDirectContractCall(true); // true = debug mode
    });
}

// Improved contract verification
export async function verifyContractAddress() {
  console.log("Verifying contract address:", contractAddress);

  try {
    // Try multiple RPC endpoints
    const rpcEndpoints = [
      "https://eth-sepolia.public.blastapi.io",
      "https://rpc.sepolia.org",
      "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // Public Infura
    ];

    let provider;
    let connected = false;

    // Try each endpoint until one works
    for (const endpoint of rpcEndpoints) {
      try {
        console.log("Trying RPC endpoint for verification:", endpoint);
        provider = new ethers.JsonRpcProvider(endpoint);

        // Test the connection
        await provider.getBlockNumber();
        console.log("Connected to RPC for verification");

        connected = true;
        break;
      } catch (rpcError) {
        console.error(
          `Failed to connect to ${endpoint} for verification:`,
          rpcError
        );
      }
    }

    if (!connected) {
      throw new Error("Failed to connect to any RPC endpoint for verification");
    }

    // Check if there's code at the address
    const code = await provider.getCode(contractAddress);
    console.log("Contract code length:", code.length);

    if (code === "0x") {
      console.error("No contract found at address:", contractAddress);
      document.getElementById("status").innerText =
        "⚠️ No contract found at the specified address. Please check configuration.";
      return false;
    }

    console.log("Contract verified at address:", contractAddress);
    return true;
  } catch (error) {
    console.error("Error verifying contract:", error);
    document.getElementById("status").innerText =
      "⚠️ Failed to verify contract: " + (error.message || "Network error");
    return false;
  }
}

// Load jackpot info with optimized approach
export async function loadJackpotInfo() {
  console.log("Loading jackpot info...");
  console.log("Using contract address:", contractAddress);

  // Verify the contract exists first
  const contractExists = await verifyContractAddress();
  if (!contractExists) {
    console.error("Contract verification failed");
    showDataError(true, "Contract verification failed. Check address.");
    return;
  }

  // Try to load from API first (fastest)
  try {
    console.log("Fetching data from subgraph:", SUBGRAPH_URL);
    console.log(
      "Query:",
      `{
      newDeposits(first: 100, orderBy: blockTimestamp, orderDirection: desc) {
        depositor
        amount
        blockTimestamp
      }
      contract(id: "${contractAddress.toLowerCase()}") {
        totalPool
        jackpotUsd
        targetUsd
        last24hDepositUsd
      }
    }`
    );

    const response = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          newDeposits(first: 100, orderBy: blockTimestamp, orderDirection: desc) {
            depositor
            amount
            blockTimestamp
          }
          contract(id: "${contractAddress.toLowerCase()}") {
            totalPool
            jackpotUsd
            targetUsd
            last24hDepositUsd
          }
        }`,
      }),
    });

    console.log("Subgraph response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("Subgraph data received:", data);

      // Check if we have any data at all
      if (
        data.data &&
        (data.data.contract ||
          (data.data.newDeposits && data.data.newDeposits.length > 0))
      ) {
        let totalPoolEth = "0";
        let jackpotUsdFormatted = "0.00";
        let targetUsdFormatted = "2,200,000.00";
        let last24hUsdFormatted = "0.00";
        let percentComplete = 0;

        // First check if we have contract data
        if (data.data.contract) {
          const contractData = data.data.contract;

          // Convert values to ETH and format
          totalPoolEth = ethers.formatEther(contractData.totalPool);
          jackpotUsdFormatted = (Number(contractData.jackpotUsd) / 1e8).toFixed(
            2
          );
          targetUsdFormatted = (Number(contractData.targetUsd) / 1e8).toFixed(
            2
          );
          last24hUsdFormatted = (
            Number(contractData.last24hDepositUsd) / 1e8
          ).toFixed(2);
          percentComplete =
            (Number(contractData.jackpotUsd) * 100) /
            Number(contractData.targetUsd);

          // Update UI with contract data
          updateUIWithBasicData(
            totalPoolEth,
            jackpotUsdFormatted,
            last24hUsdFormatted,
            percentComplete
          );
        }

        // Process deposits for leaderboard
        if (data.data.newDeposits && data.data.newDeposits.length > 0) {
          const deposits = data.data.newDeposits;

          // Process deposits to get top depositors
          let topDepositors = {};

          for (const deposit of deposits) {
            const depositor = deposit.depositor.toLowerCase();
            if (!topDepositors[depositor]) {
              topDepositors[depositor] = 0;
            }
            topDepositors[depositor] += parseFloat(
              ethers.formatEther(deposit.amount)
            );
          }

          // Convert to array for leaderboard
          const leaderboardData = Object.entries(topDepositors).map(
            ([address, amount]) => ({
              address: address,
              amount: amount.toString(),
            })
          );

          // Sort by amount descending
          leaderboardData.sort(
            (a, b) => parseFloat(b.amount) - parseFloat(a.amount)
          );

          // Update leaderboard
          updateLeaderboardFromData(leaderboardData.slice(0, 10));

          // Cache all deposits for timeframe filtering
          const allDeposits = deposits.map((d) => ({
            depositor: d.depositor,
            amount: ethers.formatEther(d.amount),
            timestamp: Number(d.blockTimestamp),
          }));

          // Cache the data
          const cacheData = {
            timestamp: Date.now(),
            totalPoolEth,
            jackpotUsdFormatted,
            targetUsdFormatted,
            last24hUsdFormatted,
            percentComplete,
            topDepositors: leaderboardData.slice(0, 10),
            allDeposits,
          };

          localStorage.setItem("contractData", JSON.stringify(cacheData));
        }

        // Hide error message if it was showing
        showDataError(false);

        return;
      }
    }
  } catch (e) {
    console.error("Error fetching from subgraph:", e);
  }

  // If we get here, the subgraph failed - try to use cached data
  const cachedFallbackData = localStorage.getItem("contractData");
  if (cachedFallbackData) {
    try {
      const data = JSON.parse(cachedFallbackData);
      if (Date.now() - data.timestamp < 5 * 60 * 1000) {
        // Cache valid for 5 minutes
        console.log("Using cached data from", new Date(data.timestamp));
        updateUIWithBasicData(
          data.totalPoolEth,
          data.jackpotUsdFormatted,
          data.last24hUsdFormatted,
          data.percentComplete
        );

        if (data.topDepositors && data.topDepositors.length > 0) {
          updateLeaderboardFromData(data.topDepositors);
        }

        // Try to refresh in background
        setTimeout(() => {
          tryDirectContractCall();
        }, 100);

        return;
      }
    } catch (e) {
      console.error("Error parsing cached data:", e);
    }
  }

  // If we get here, both subgraph and cache failed - try direct contract call
  console.log("Subgraph and cache failed, trying direct contract call");
  await tryDirectContractCall();
}

// Improved direct contract call with debug option
export async function tryDirectContractCall(debug = false) {
  if (debug) console.log("=== DIRECT CONTRACT CALL DEBUGGING ===");

  try {
    if (debug) console.log("Attempting direct contract call");
    if (debug) console.log("Contract address:", contractAddress);

    // Try multiple RPC endpoints in case one fails
    const rpcEndpoints = [
      "https://eth-sepolia.public.blastapi.io",
      "https://rpc.sepolia.org",
      "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // Public Infura endpoint
    ];

    let provider;
    let connected = false;

    // Try each endpoint until one works
    for (const endpoint of rpcEndpoints) {
      try {
        if (debug) console.log("Trying RPC endpoint:", endpoint);
        provider = new ethers.JsonRpcProvider(endpoint);

        // Test the connection with a simple call
        const blockNumber = await provider.getBlockNumber();
        if (debug) console.log("Connected to RPC. Block number:", blockNumber);

        connected = true;
        break;
      } catch (rpcError) {
        if (debug) console.error(`Failed to connect to ${endpoint}:`, rpcError);
      }
    }

    if (!connected) {
      throw new Error("Failed to connect to any RPC endpoint");
    }

    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Fetch basic data
    if (debug) console.log("Fetching contract data...");

    try {
      const totalPool = await contract.totalPool();
      if (debug)
        console.log("Total pool:", ethers.formatEther(totalPool), "ETH");

      // Store current width to prevent flicker
      const progressFill = document.getElementById("progressFill");
      const currentWidth = progressFill ? progressFill.style.width : "0%";

      // Update UI with this data
      const totalPoolEth = ethers.formatEther(totalPool);
      document.getElementById(
        "jackpot"
      ).innerHTML = `<strong>${totalPoolEth} ETH</strong>`;

      // Try to get more data
      try {
        const jackpotUsd = await contract.getJackpotUsd();
        const targetUsd = await contract.TARGET_USD();
        const last24hDepositUsd = await contract.last24hDepositUsd();

        if (debug) {
          console.log("Jackpot USD:", Number(jackpotUsd) / 1e8);
          console.log("Target USD:", Number(targetUsd) / 1e8);
          console.log("Last 24h USD:", Number(last24hDepositUsd) / 1e8);
        }

        // Calculate percentage
        const percentComplete = (Number(jackpotUsd) * 100) / Number(targetUsd);

        // Format values
        const jackpotUsdFormatted = (Number(jackpotUsd) / 1e8).toFixed(2);
        const last24hUsdFormatted = (Number(last24hDepositUsd) / 1e8).toFixed(
          2
        );

        // Update jackpot display
        document.getElementById(
          "jackpot"
        ).innerHTML = `<strong>${totalPoolEth} ETH ($${jackpotUsdFormatted})</strong>`;

        // Update 24h deposits
        document.getElementById("usd24h").innerText = last24hUsdFormatted;

        // Update progress bar with animation to prevent flicker
        if (progressFill) {
          // Set transition temporarily to none
          progressFill.style.transition = "none";
          progressFill.style.width = currentWidth;

          // Force a reflow
          void progressFill.offsetWidth;

          // Restore transition and set new width
          progressFill.style.transition = "width 0.5s ease-in-out";
          progressFill.style.width = `${Math.min(percentComplete, 100)}%`;
        }

        // Cache the data
        const cacheData = {
          timestamp: Date.now(),
          totalPoolEth,
          jackpotUsdFormatted,
          targetUsdFormatted: (Number(targetUsd) / 1e8).toFixed(2),
          last24hUsdFormatted,
          percentComplete,
        };

        localStorage.setItem("contractData", JSON.stringify(cacheData));
      } catch (dataError) {
        if (debug) console.error("Error fetching additional data:", dataError);
      }

      // Hide any error messages since we got some data
      showDataError(false);

      return true;
    } catch (contractError) {
      if (debug) console.error("Contract call error:", contractError);
      throw contractError;
    }
  } catch (e) {
    console.error("Direct contract call failed:", e);

    // Show error message
    showDataError(
      true,
      "Failed to load data: " + (e.message || "Unknown error")
    );

    return false;
  }
}

// Helper function to update UI with basic data
function updateUIWithBasicData(
  totalPoolEth,
  jackpotUsdFormatted,
  last24hUsdFormatted,
  percentComplete
) {
  // Update total pool display (formerly jackpot)
  const jackpotEl = document.getElementById("jackpot");
  if (jackpotEl) {
    jackpotEl.innerHTML = `<strong>${totalPoolEth}</strong> ETH`;
  }

  // Update USD value display
  const usdValueEl = document.getElementById("usdValue");
  if (usdValueEl) {
    usdValueEl.innerText = `$${jackpotUsdFormatted}`;
  }

  // Update 24h deposit display
  const usd24hEl = document.getElementById("usd24h");
  if (usd24hEl) {
    usd24hEl.innerText = `$${last24hUsdFormatted}`;
  }

  // Update progress bar
  const progressFillEl = document.getElementById("progressFill");
  if (progressFillEl) {
    progressFillEl.style.width = `${Math.min(percentComplete, 100)}%`;
    console.log(
      "Setting progress bar width to:",
      `${Math.min(percentComplete, 100)}%`
    );
  }

  // Update progress percentage if it exists
  const progressPercentEl = document.getElementById("progressPercent");
  if (progressPercentEl) {
    progressPercentEl.innerText = `${percentComplete.toFixed(2)}%`;
  }

  // Update status message based on percent complete
  updateStatusMessageFromPercent(percentComplete);

  console.log("UI updated with basic data:", {
    totalPoolEth,
    jackpotUsdFormatted,
    last24hUsdFormatted,
    percentComplete,
  });
}

// Use cached data if available
function useCachedDataIfAvailable() {
  const cachedData = localStorage.getItem("contractData");
  if (cachedData) {
    try {
      const data = JSON.parse(cachedData);
      console.log("Using cached data from", new Date(data.timestamp));

      updateUIWithBasicData(
        data.totalPoolEth || "0",
        data.jackpotUsdFormatted || "0.00",
        data.last24hUsdFormatted || "0.00",
        data.percentComplete || 0
      );

      if (data.topDepositors && data.topDepositors.length > 0) {
        updateLeaderboardFromData(data.topDepositors);
      }

      // Show a message that we're using cached data
      showDataError(
        true,
        "Using cached data. Network connection issues detected."
      );
    } catch (e) {
      console.error("Error parsing cached data:", e);
      showDataError(true, "Failed to load data. Please try again later.");
    }
  } else {
    showDataError(
      true,
      "Failed to load data and no cache available. Please try again later."
    );
  }
}

// Update leaderboard from data
function updateLeaderboardFromData(
  topDepositors,
  selectedTimeframe = "allTime"
) {
  const leaderboardEl = document.getElementById("leaderboard");
  if (!leaderboardEl) return;

  console.log("Updating leaderboard with data:", topDepositors);

  // Update timeframe selector if it exists
  const timeframeSelector = document.getElementById("timeframeSelector");
  if (timeframeSelector) {
    timeframeSelector.value = selectedTimeframe;
  }

  let html = ``;

  if (topDepositors && topDepositors.length > 0) {
    topDepositors.forEach((entry, index) => {
      // Format address for display
      const shortAddress = `${entry.address.substring(
        0,
        6
      )}...${entry.address.substring(38)}`;

      html += `
        <div class="leaderboard-row">
          <span class="leaderboard-rank">${index + 1}</span>
          <a 
            id="leaderboard-address-${index}" 
            class="leaderboard-address" 
            href="https://sepolia.etherscan.io/address/${entry.address}" 
            target="_blank"
            data-address="${entry.address}"
          >${shortAddress}</a>
          <span class="leaderboard-amount">${parseFloat(entry.amount).toFixed(
            4
          )} ETH</span>
        </div>
      `;
    });

    // Try to resolve ENS names after rendering
    setTimeout(() => resolveENSNames(topDepositors), 100);
  } else {
    html += `
      <div class="leaderboard-row empty">
        <span colspan="3">No deposits for this timeframe</span>
      </div>
    `;
  }

  leaderboardEl.innerHTML = html;
}

// Completely rewritten ENS resolution function
async function resolveENSNames(topDepositors) {
  if (!topDepositors || topDepositors.length === 0) {
    console.log("No depositors to resolve ENS names for");
    return;
  }

  console.log("Resolving ENS names for:", topDepositors);

  try {
    // Use Alchemy's public endpoint which has better ENS support
    const provider = new ethers.JsonRpcProvider(
      "https://eth-mainnet.g.alchemy.com/v2/demo"
    );

    console.log("Created provider for ENS resolution");

    // Process each depositor
    for (let i = 0; i < topDepositors.length; i++) {
      const address = topDepositors[i].address;
      if (!address) continue;

      const addressElement = document.getElementById(
        `leaderboard-address-${i}`
      );
      if (!addressElement) continue;

      console.log(`Looking up ENS for ${address}`);

      try {
        const ensName = await provider.lookupAddress(address);

        if (ensName) {
          console.log(`Found ENS name for ${address}: ${ensName}`);
          addressElement.innerText = ensName;
          // Keep the link to Etherscan
          addressElement.title = address;
        } else {
          console.log(`No ENS name found for ${address}`);
        }
      } catch (error) {
        console.error(`Error resolving ENS for ${address}:`, error);
      }
    }
  } catch (error) {
    console.error("Error setting up ENS resolution:", error);
  }
}

// Make ENS resolution function available globally
window.resolveENSNames = resolveENSNames;

// Add a function to manually trigger ENS resolution
window.refreshENSNames = function () {
  console.log("Manually refreshing ENS names");

  // Extract addresses from the DOM
  const addresses = [];
  for (let i = 0; i < 10; i++) {
    const addressEl = document.getElementById(`leaderboard-address-${i}`);
    if (addressEl) {
      const address = addressEl.getAttribute("data-address");
      if (address) {
        addresses.push({ address });
      }
    }
  }

  if (addresses.length > 0) {
    resolveENSNames(addresses);
  } else {
    console.log("No addresses found to resolve");
  }
};

// Filter entries by timeframe
function filterEntriesByTimeframe(entries, timeframe) {
  if (!entries || entries.length === 0) return [];

  const now = Math.floor(Date.now() / 1000);

  if (timeframe === "allTime") {
    return entries;
  } else if (timeframe === "24h") {
    return entries.filter((entry) => now - entry.timestamp < 24 * 60 * 60);
  } else if (timeframe === "7d") {
    return entries.filter((entry) => now - entry.timestamp < 7 * 24 * 60 * 60);
  }

  return entries;
}

// Update status message based on percent complete
function updateStatusMessageFromPercent(percentComplete) {
  const statusEl = document.getElementById("jackpotStatus");
  if (!statusEl) return;

  if (percentComplete >= 100) {
    statusEl.innerText = "🔥 JACKPOT READY! Waiting for cooldown period...";
    statusEl.className = "status-ready";
  } else if (percentComplete >= 90) {
    statusEl.innerText =
      "🔥 JACKPOT ALMOST READY! " + percentComplete.toFixed(1) + "% complete";
    statusEl.className = "status-almost";
  } else if (percentComplete >= 50) {
    statusEl.innerText =
      "🚀 JACKPOT GROWING! " + percentComplete.toFixed(1) + "% complete";
    statusEl.className = "status-growing";
  } else {
    statusEl.innerText =
      "🌱 JACKPOT BUILDING! " + percentComplete.toFixed(1) + "% complete";
    statusEl.className = "status-building";
  }
}

// Set up auto-refresh
export function setupAutoRefresh() {
  // Initial load
  loadJackpotInfo();

  // Refresh every 30 seconds but preserve timeframe
  setInterval(() => {
    // Get current timeframe before refresh
    const currentTimeframe =
      localStorage.getItem("selectedTimeframe") || "allTime";

    // Load data
    loadJackpotInfo().then(() => {
      // Ensure timeframe is preserved if it's not allTime
      if (currentTimeframe !== "allTime") {
        setTimeout(() => {
          changeTimeframe(currentTimeframe);
        }, 100);
      }
    });
  }, 30000);
}

// Add this function to show/hide the error message
function showDataError(show, message = null) {
  const errorElement = document.getElementById("dataLoadingError");
  if (!errorElement) return;

  if (show) {
    errorElement.style.display = "block";
    if (message) {
      errorElement.querySelector("p").textContent = "⚠️ " + message;
    }
  } else {
    errorElement.style.display = "none";
  }
}

// Add this function to clear cached data
export function clearCache() {
  localStorage.removeItem("contractData");
  console.log("Cache cleared");

  // Reload data
  loadJackpotInfo();
}

// Make updateLeaderboardFromData available globally
window.updateLeaderboardFromData = updateLeaderboardFromData;

// Export the changeTimeframe function
export function changeTimeframe(timeframe) {
  console.log("Changing timeframe to:", timeframe);

  // Update the selector UI
  const selector = document.getElementById("timeframeSelector");
  if (selector) {
    selector.value = timeframe;
  }

  // Get cached data
  const cachedData = localStorage.getItem("contractData");
  if (!cachedData) {
    console.error("No cached data available for timeframe filtering");
    return;
  }

  try {
    const data = JSON.parse(cachedData);

    if (!data.allDeposits || data.allDeposits.length === 0) {
      console.error("No deposit data available for timeframe filtering");
      return;
    }

    // Filter deposits by timeframe
    const filteredDeposits = filterEntriesByTimeframe(
      data.allDeposits,
      timeframe
    );

    // Group by address and sum amounts
    const depositorMap = new Map();
    filteredDeposits.forEach((deposit) => {
      const currentAmount = depositorMap.get(deposit.depositor) || 0;
      depositorMap.set(
        deposit.depositor,
        currentAmount + parseFloat(deposit.amount)
      );
    });

    // Convert to array and sort by amount
    const leaderboardData = Array.from(depositorMap.entries()).map(
      ([address, amount]) => ({
        address,
        amount: amount.toString(),
      })
    );

    // Sort by amount descending
    leaderboardData.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

    // Update leaderboard with filtered data
    updateLeaderboardFromData(leaderboardData.slice(0, 10), timeframe);
  } catch (e) {
    console.error("Error filtering by timeframe:", e);
  }
}

// Make sure the changeTimeframe function is available globally
window.changeTimeframe = changeTimeframe;

// Import the debugWalletConnection function from wallet.js
import { debugWalletConnection } from "./wallet.js";
