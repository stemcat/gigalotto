import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

// Contract details
const contractAddress = "0x8366A6F4adbB6D2D9fDC4cD5B9b0aC5f12D96dF1";
const abi = [
  "function totalPool() view returns (uint256)",
  "function getJackpotUsd() view returns (uint256)",
  "function TARGET_USD() view returns (uint256)",
  "function last24hDepositUsd() view returns (uint256)",
  "function getEntriesCount() view returns (uint256)",
  "function getEntry(uint256 index) view returns (address user, uint256 cumulative)",
  "function userDeposits(address user) view returns (uint256)",
];

// Get a fast Sepolia provider
export async function getReadOnlyProvider() {
  // Try Ankr's dedicated Sepolia endpoint first (fastest option)
  try {
    const ankrProvider = new ethers.JsonRpcProvider(
      "https://rpc.ankr.com/eth_sepolia"
    );
    await ankrProvider.getBlockNumber();
    console.log("Connected to Ankr Sepolia endpoint");
    return ankrProvider;
  } catch (e) {
    console.error("Failed to connect to Ankr Sepolia:", e);
  }

  // Fallback to other providers
  const rpcUrls = [
    "https://eth-sepolia.g.alchemy.com/v2/demo", // Alchemy's public endpoint
    "https://rpc.sepolia.org",
    "https://eth-sepolia.public.blastapi.io",
    "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // Public Infura key
  ];

  for (const url of rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber();
      console.log(`Connected to Sepolia via ${url}`);
      return provider;
    } catch (e) {
      console.error(`Failed to connect to ${url}:`, e);
    }
  }

  throw new Error("All Sepolia RPC endpoints failed");
}

// Update the subgraph endpoint with your actual deployed subgraph URL
const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/113076/gigalottosepolia/version/latest";

// Load jackpot info with optimized approach
export async function loadJackpotInfo() {
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
    const response = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          contract(id: "${contractAddress.toLowerCase()}") {
            totalPool
            jackpotUsd
            targetUsd
            last24hDepositUsd
            entries(first: 20, orderBy: amount, orderDirection: desc) {
              user
              amount
            }
          }
        }`,
      }),
    });

    console.log("Subgraph response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("Subgraph data received:", data);

      if (data.data && data.data.contract) {
        console.log("Contract data found, updating UI");
        updateUIFromGraphData(data.data.contract);
        return; // Exit early if API works
      } else {
        console.error("No contract data in response:", data);
      }
    } else {
      console.error("Subgraph response not OK:", await response.text());
    }
  } catch (apiError) {
    console.error(
      "API fetch failed, falling back to direct contract calls:",
      apiError
    );
  }

  // Fallback to direct contract calls if subgraph fails
  try {
    // Use cached data while loading
    const cachedData = localStorage.getItem("contractData");
    if (cachedData) {
      try {
        const data = JSON.parse(cachedData);
        const cacheAge = Date.now() - data.timestamp;
        if (cacheAge < 5 * 60 * 1000) {
          // 5 minutes
          updateUIFromCachedData(data);
        }
      } catch (e) {
        console.error("Error parsing cached data:", e);
      }
    }

    // Get provider and contract
    const provider = await getReadOnlyProvider();
    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Fetch basic data in parallel
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
    const percentComplete = (Number(jackpotUsd) * 100) / Number(targetUsd);

    // Update UI immediately with basic data
    updateUIWithBasicData(
      totalPoolEth,
      jackpotUsdFormatted,
      last24hUsdFormatted,
      percentComplete
    );

    // Cache basic data
    const basicData = {
      totalPoolEth,
      jackpotUsdFormatted,
      last24hUsdFormatted,
      percentComplete,
      timestamp: Date.now(),
    };
    localStorage.setItem("contractData", JSON.stringify(basicData));

    // Fetch top depositors in background
    fetchTopDepositors(contract, basicData);
  } catch (e) {
    console.error("Failed to load jackpot info:", e);
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
  document.getElementById(
    "jackpot"
  ).innerHTML = `<strong>${totalPoolEth} ETH</strong> ($${jackpotUsdFormatted})`;
  document.getElementById("usd24h").innerText = `$${last24hUsdFormatted}`;
  document.getElementById("progressFill").style.width = `${Math.min(
    Number(percentComplete),
    100
  )}%`;
  updateStatusMessageFromPercent(percentComplete);
}

// Helper function to update UI from Graph API data
function updateUIFromGraphData(data) {
  const totalPoolEth = ethers.formatEther(data.totalPool);
  const jackpotUsdFormatted = (Number(data.jackpotUsd) / 1e8).toFixed(2);
  const last24hUsdFormatted = (Number(data.last24hDepositUsd) / 1e8).toFixed(2);
  const percentComplete =
    (Number(data.jackpotUsd) * 100) / Number(data.targetUsd);

  updateUIWithBasicData(
    totalPoolEth,
    jackpotUsdFormatted,
    last24hUsdFormatted,
    percentComplete
  );

  if (data.entries && data.entries.length > 0) {
    const topDepositors = data.entries.slice(0, 5).map((entry) => ({
      address: entry.user,
      amount: ethers.formatEther(entry.amount),
    }));
    updateLeaderboardFromData(topDepositors);
  }

  // Cache the data
  localStorage.setItem(
    "contractData",
    JSON.stringify({
      totalPoolEth,
      jackpotUsdFormatted,
      last24hUsdFormatted,
      percentComplete,
      topDepositors: data.entries?.slice(0, 5).map((entry) => ({
        address: entry.user,
        amount: ethers.formatEther(entry.amount),
      })),
      timestamp: Date.now(),
    })
  );
}

// Fetch top depositors in background
async function fetchTopDepositors(contract, basicData) {
  try {
    document.getElementById("leaderboard").innerHTML =
      "<h3>🏆 TOP DEPOSITORS</h3><div class='leaderboard-entry'>Loading depositors...</div>";

    const entriesCount = await contract.getEntriesCount();
    const maxEntries = Math.min(Number(entriesCount), 20);
    const depositorMap = new Map();

    // Process in batches of 5 for better performance
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

  // Refresh every 30 seconds
  setInterval(loadJackpotInfo, 30000);
}
