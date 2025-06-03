import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

// Contract details
const contractAddress = "0x9921e7B46EC46AbFcF4CE531688E79c8862604Fa";
const abi = [
  "function totalPool() view returns (uint256)",
  "function getJackpotUsd() view returns (uint256)",
  "function TARGET_USD() view returns (uint256)",
  "function last24hDepositUsd() view returns (uint256)",
  "function getEntriesCount() view returns (uint256)",
  "function getEntry(uint256 index) view returns (address user, uint256 cumulative)",
  "function userDeposits(address user) view returns (uint256)",
];

// Get a provider with fallbacks - UPDATED FOR SEPOLIA
export async function getReadOnlyProvider() {
  console.log("Getting Sepolia testnet provider...");
  const rpcUrls = [
    "https://rpc.sepolia.org",
    "https://eth-sepolia.public.blastapi.io",
    "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // Public Infura key
    "https://rpc2.sepolia.org",
  ];

  for (const url of rpcUrls) {
    try {
      console.log(`Trying Sepolia provider: ${url}`);
      const provider = new ethers.JsonRpcProvider(url);
      const network = await provider.getNetwork();
      console.log(`Connected to network: ${network.name} (${network.chainId})`);

      // Verify we're on Sepolia (chainId 11155111)
      if (network.chainId !== 11155111n) {
        console.warn(`Provider ${url} is not on Sepolia testnet`);
        continue;
      }

      await provider.getBlockNumber();
      console.log(`Successfully connected to Sepolia via ${url}`);
      return provider;
    } catch (e) {
      console.error(`Failed to connect to ${url}:`, e);
    }
  }

  throw new Error("All Sepolia RPC endpoints failed");
}

// Load jackpot info
export async function loadJackpotInfo() {
  try {
    // Show loading state but don't clear existing data immediately
    const jackpotEl = document.getElementById("jackpot");
    const usd24hEl = document.getElementById("usd24h");

    // Only show loading if we don't have data yet
    if (!jackpotEl.innerHTML.includes("ETH")) {
      jackpotEl.innerHTML = "<strong>Loading...</strong>";
    }
    if (
      usd24hEl.innerText === "" ||
      usd24hEl.innerText === "Error loading data"
    ) {
      usd24hEl.innerText = "Loading...";
    }

    // Check if we have recent cached data (less than 2 minutes old)
    const cachedData = localStorage.getItem("contractData");
    if (cachedData) {
      try {
        const data = JSON.parse(cachedData);
        const cacheAge = Date.now() - data.timestamp;

        // Use cached data if less than 2 minutes old while fetching fresh data
        if (cacheAge < 2 * 60 * 1000) {
          console.log("Using cached data from", new Date(data.timestamp));
          updateUIFromCachedData(data);
        }
      } catch (cacheError) {
        console.error("Error parsing cached data:", cacheError);
      }
    }

    // Get provider
    const provider = await getReadOnlyProvider();
    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Use Promise.all to fetch basic data in parallel
    console.log("Fetching contract data in parallel...");
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

    // Calculate percentage
    const percentComplete = (Number(jackpotUsd) * 100) / Number(targetUsd);

    // Update UI with basic data immediately
    document.getElementById(
      "jackpot"
    ).innerHTML = `<strong>${totalPoolEth} ETH</strong> ($${jackpotUsdFormatted})`;
    document.getElementById("usd24h").innerText = `$${last24hUsdFormatted}`;
    document.getElementById("progressFill").style.width = `${Math.min(
      Number(percentComplete),
      100
    )}%`;
    updateStatusMessageFromPercent(percentComplete);

    // Cache basic data immediately
    const basicData = {
      totalPoolEth,
      jackpotUsdFormatted,
      last24hUsdFormatted,
      percentComplete,
      timestamp: Date.now(),
    };

    localStorage.setItem("contractData", JSON.stringify(basicData));

    // Fetch top depositors in the background
    try {
      console.log("Fetching top depositors...");
      document.getElementById("leaderboard").innerHTML =
        "<h3>🏆 TOP DEPOSITORS</h3><div class='leaderboard-entry'>Loading depositors...</div>";

      const entriesCount = await contract.getEntriesCount();
      const maxEntries = Math.min(Number(entriesCount), 20);
      const depositorMap = new Map();

      // Get unique depositors - process in batches of 5 for better performance
      for (let i = 0; i < maxEntries; i += 5) {
        const batchPromises = [];
        for (let j = i; j < Math.min(i + 5, maxEntries); j++) {
          batchPromises.push(fetchEntryData(contract, j, depositorMap));
        }
        await Promise.all(batchPromises);
      }

      // Convert to array and sort
      const topDepositors = Array.from(depositorMap.entries())
        .map(([address, amount]) => ({
          address,
          amount: ethers.formatEther(amount),
        }))
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
        .slice(0, 5);

      // Update leaderboard
      updateLeaderboardFromData(topDepositors);

      // Update cache with complete data
      const completeData = {
        ...basicData,
        topDepositors,
        timestamp: Date.now(),
      };

      localStorage.setItem("contractData", JSON.stringify(completeData));
    } catch (e) {
      console.error("Error fetching top depositors:", e);
      document.getElementById("leaderboard").innerHTML =
        "<h3>🏆 TOP DEPOSITORS</h3><div class='leaderboard-entry'>Error loading depositors</div>";
    }
  } catch (e) {
    console.error("Failed to load jackpot info:", e);
    useCachedDataIfAvailable();
  }
}

// Use cached data if available
function useCachedDataIfAvailable() {
  const cachedData = localStorage.getItem("contractData");

  if (cachedData) {
    try {
      const data = JSON.parse(cachedData);
      const cacheAge = Date.now() - data.timestamp;

      if (cacheAge < 10 * 60 * 1000) {
        console.log("Using cached data from", new Date(data.timestamp));

        document.getElementById(
          "jackpot"
        ).innerHTML = `<strong>${data.totalPoolEth} ETH</strong> ($${data.jackpotUsdFormatted})`;

        document.getElementById(
          "usd24h"
        ).innerText = `$${data.last24hUsdFormatted}`;

        document.getElementById("progressFill").style.width = `${Math.min(
          Number(data.percentComplete),
          100
        )}%`;

        updateStatusMessageFromPercent(data.percentComplete);
        updateLeaderboardFromData(data.topDepositors);

        document.getElementById(
          "status"
        ).innerHTML += `<p><small>(Data from ${Math.round(
          cacheAge / 60000
        )} min ago)</small></p>`;

        return true;
      }
    } catch (cacheError) {
      console.error("Error parsing cached data:", cacheError);
    }
  }

  document.getElementById("jackpot").innerHTML =
    "<strong>Error loading data</strong>";
  document.getElementById("usd24h").innerText = "Error loading data";
  document.getElementById("progressFill").style.width = "0%";
  document.getElementById("leaderboard").innerHTML =
    "<h3>🏆 TOP DEPOSITORS</h3><div class='leaderboard-entry'>Error loading data</div>";
  document.getElementById("status").innerHTML =
    "<p>Unable to load contract data. Please refresh or try again later.</p>";

  return false;
}

// Update leaderboard from data
function updateLeaderboardFromData(depositors) {
  const leaderboardContainer = document.getElementById("leaderboard");
  if (!leaderboardContainer) return;

  let html = `<h3>🏆 TOP DEPOSITORS</h3>`;

  if (!depositors || depositors.length === 0) {
    html += `<div class="leaderboard-entry">No depositors yet</div>`;
  } else {
    for (let i = 0; i < depositors.length; i++) {
      const { address, amount } = depositors[i];
      const display = `${address.slice(0, 6)}...${address.slice(-4)}`;

      html += `
        <div class="leaderboard-entry">
          <span class="rank">${i + 1}.</span>
          <span class="name">${display}</span>
          <span class="amount">${parseFloat(amount).toFixed(3)} ETH</span>
        </div>
      `;
    }
  }

  leaderboardContainer.innerHTML = html;
}

// Update status message based on percent
function updateStatusMessageFromPercent(percent) {
  const statusElement = document.getElementById("status");
  if (!statusElement) return;

  if (percent >= 100) {
    statusElement.innerHTML = `<p>Waiting for winner...</p>`;
  } else if (percent < 25) {
    statusElement.innerHTML = `<p>The jackpot is just getting started! 🚀</p>`;
  } else if (percent < 50) {
    statusElement.innerHTML = `<p>The pot is growing! Don't miss out! 🚀</p>`;
  } else if (percent < 75) {
    statusElement.innerHTML = `<p>We're more than halfway there! 🔥</p>`;
  } else {
    statusElement.innerHTML = `<p>Almost at target! Last chance to join! ⏰</p>`;
  }
}

// Helper function to fetch entry data
async function fetchEntryData(contract, index, depositorMap) {
  try {
    const entry = await contract.getEntry(index);
    const address = entry[0];

    if (!depositorMap.has(address)) {
      const deposit = await contract.userDeposits(address);
      depositorMap.set(address, deposit);
    }
  } catch (e) {
    console.error(`Error fetching entry ${index}:`, e);
  }
}

// Helper function to update UI from cached data
function updateUIFromCachedData(data) {
  document.getElementById(
    "jackpot"
  ).innerHTML = `<strong>${data.totalPoolEth} ETH</strong> ($${data.jackpotUsdFormatted})`;
  document.getElementById("usd24h").innerText = `$${data.last24hUsdFormatted}`;
  document.getElementById("progressFill").style.width = `${Math.min(
    Number(data.percentComplete),
    100
  )}%`;
  updateStatusMessageFromPercent(data.percentComplete);

  if (data.topDepositors) {
    updateLeaderboardFromData(data.topDepositors);
  }
}

// Setup auto refresh with better timing
export function setupAutoRefresh() {
  loadJackpotInfo();

  // Use a more reasonable refresh interval (2 minutes)
  setInterval(loadJackpotInfo, 120000);
}
