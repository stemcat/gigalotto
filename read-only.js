import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

// Contract details
const contractAddress = "0xE5aB5F5cb61FeE8650B5Fe1c10Fe8E20961b2081"; // Your new contract address
const abi = [
  "function totalPool() view returns (uint256)",
  "function getJackpotUsd() view returns (uint256)",
  "function TARGET_USD() view returns (uint256)",
  "function last24hDepositUsd() view returns (uint256)",
  "function getEntriesCount() view returns (uint256)",
  "function getEntry(uint256 index) view returns (address user, uint256 cumulative)",
  "function userDeposits(address user) view returns (uint256)",
];

// Update the subgraph endpoint with your actual deployed subgraph URL
const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/113076/gigalottosepolia/version/latest";

// Load jackpot info with optimized approach
export async function loadJackpotInfo() {
  // Check if cached data is for the current contract
  const cachedContractData = localStorage.getItem("contractData");
  if (cachedContractData) {
    try {
      const data = JSON.parse(cachedContractData);
      if (data.contractAddress && data.contractAddress !== contractAddress) {
        // Contract address changed, clear cache
        console.log("Contract address changed, clearing cache");
        localStorage.removeItem("contractData");
      }
    } catch (e) {
      console.error("Error parsing cached data:", e);
    }
  }

  // Show loading state but keep existing data
  const jackpotEl = document.getElementById("jackpot");
  const usd24hEl = document.getElementById("usd24h");

  if (!jackpotEl.innerHTML.includes("ETH")) {
    jackpotEl.innerHTML = "<strong>Loading...</strong>";
  }
  if (!usd24hEl.innerText.includes("$")) {
    usd24hEl.innerText = "Loading...";
  }

  // Try to load from API first (fastest)
  try {
    console.log("Fetching data from subgraph:", SUBGRAPH_URL);
    console.log(
      "Query:",
      `{
      newDeposits(first: 20, orderBy: blockTimestamp, orderDirection: desc) {
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
          newDeposits(first: 20, orderBy: blockTimestamp, orderDirection: desc) {
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

        // Process deposits for leaderboard if available
        if (data.data.newDeposits && data.data.newDeposits.length > 0) {
          console.log("Deposits found:", data.data.newDeposits.length);

          // Process deposits to get top depositors
          let topDepositors = {};

          for (const deposit of data.data.newDeposits) {
            const amount = BigInt(deposit.amount);

            // Track deposits by user for leaderboard
            const depositor = deposit.depositor.toLowerCase();
            if (!topDepositors[depositor]) {
              topDepositors[depositor] = BigInt(0);
            }
            topDepositors[depositor] += amount;
          }

          // Convert topDepositors to array for leaderboard
          const leaderboardData = Object.entries(topDepositors).map(
            ([address, amount]) => ({
              address: address,
              amount: ethers.formatEther(amount.toString()),
            })
          );

          // Sort by amount descending
          leaderboardData.sort(
            (a, b) => parseFloat(b.amount) - parseFloat(a.amount)
          );

          // Update leaderboard
          updateLeaderboardFromData(leaderboardData.slice(0, 10));

          // Cache the data
          const basicData = {
            contractAddress: contractAddress,
            totalPoolEth: totalPoolEth,
            jackpotUsdFormatted: jackpotUsdFormatted,
            targetUsdFormatted: targetUsdFormatted,
            last24hUsdFormatted: last24hUsdFormatted,
            percentComplete: percentComplete,
            topDepositors: leaderboardData.slice(0, 10),
            timestamp: Date.now(),
          };

          localStorage.setItem("contractData", JSON.stringify(basicData));

          // Hide any error messages
          showDataError(false);
          return; // Exit early if API works
        }
      } else {
        console.log("No data found in subgraph response");
        showDataError(
          true,
          "No data found. The subgraph may still be syncing."
        );
      }
    }
  } catch (apiError) {
    console.error(
      "Subgraph API fetch failed, falling back to direct contract calls:",
      apiError
    );
    showDataError(
      true,
      "Failed to fetch data from subgraph. Trying direct contract calls."
    );
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

  // Last resort - try direct contract call
  tryDirectContractCall();
}

// Separate function for direct contract calls as last resort
export async function tryDirectContractCall() {
  try {
    console.log("Attempting direct contract call as last resort");

    // Use a public RPC endpoint that allows CORS
    const provider = new ethers.JsonRpcProvider(
      "https://eth-sepolia.public.blastapi.io"
    );

    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Fetch basic data
    console.log("Fetching contract data...");
    const [totalPool, jackpotUsd, targetUsd, last24hUsd] = await Promise.all([
      contract.totalPool(),
      contract.getJackpotUsd(),
      contract.TARGET_USD(),
      contract.last24hDepositUsd(),
    ]);

    // Format values
    const totalPoolEth = ethers.formatEther(totalPool);
    const jackpotUsdFormatted = (Number(jackpotUsd) / 1e8).toFixed(2);
    const targetUsdFormatted = (Number(targetUsd) / 1e8).toFixed(2);
    const last24hUsdFormatted = (Number(last24hUsd) / 1e8).toFixed(2);
    const percentComplete = (Number(jackpotUsd) * 100) / Number(targetUsd);

    // Update UI
    updateUIWithBasicData(
      totalPoolEth,
      jackpotUsdFormatted,
      last24hUsdFormatted,
      percentComplete
    );

    // Try to get entries for leaderboard
    try {
      const entriesCount = await contract.getEntriesCount();
      const entries = [];

      // Only fetch up to 20 entries to avoid too many calls
      const countToFetch = Math.min(Number(entriesCount), 20);

      for (let i = 0; i < countToFetch; i++) {
        const entry = await contract.getEntry(i);
        entries.push({
          address: entry.user,
        });
      }

      // Update leaderboard
      updateLeaderboardFromData(entries);
    } catch (error) {
      console.error("Error fetching leaderboard entries:", error);
    }

    // Store basic data
    const basicData = {
      contractAddress: contractAddress,
      totalPoolEth,
      jackpotUsdFormatted,
      targetUsdFormatted,
      last24hUsdFormatted,
      percentComplete,
      timestamp: Date.now(),
    };

    localStorage.setItem("contractData", JSON.stringify(basicData));

    // Hide any error messages
    showDataError(false);
  } catch (e) {
    console.error("All data fetching methods failed:", e);
    useCachedDataIfAvailable();
  }
}

// Helper function to update UI with basic data
function updateUIWithBasicData(
  totalPoolEth,
  jackpotUsdFormatted,
  last24hUsdFormatted,
  percentComplete
) {
  // Update jackpot display
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

  // Update progress bar if it exists
  const progressBarEl = document.getElementById("progressBar");
  if (progressBarEl) {
    progressBarEl.style.width = `${Math.min(percentComplete, 100)}%`;
  }

  // Update progress percentage if it exists
  const progressPercentEl = document.getElementById("progressPercent");
  if (progressPercentEl) {
    progressPercentEl.innerText = `${percentComplete.toFixed(2)}%`;
  }

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
function updateLeaderboardFromData(topDepositors) {
  const leaderboardEl = document.getElementById("leaderboard");
  if (!leaderboardEl) return;

  let html = "<h3>🏆 TOP DEPOSITORS</h3>";

  if (topDepositors && topDepositors.length > 0) {
    topDepositors.forEach((depositor, index) => {
      const shortAddress = `${depositor.address.substring(
        0,
        6
      )}...${depositor.address.substring(38)}`;
      html += `
        <div class="leaderboard-entry">
          <span class="rank">${index + 1}</span>
          <span class="address">${shortAddress}</span>
          <span class="amount">${parseFloat(depositor.amount).toFixed(
            4
          )} ETH</span>
        </div>
      `;
    });
  } else {
    html += "<div class='leaderboard-entry'>No deposits yet</div>";
  }

  leaderboardEl.innerHTML = html;
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

  // Refresh every 30 seconds
  setInterval(loadJackpotInfo, 30000);
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
