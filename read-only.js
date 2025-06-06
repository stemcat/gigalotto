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
  "function withdrawableAmounts(address) view returns (uint256)",
  "function userDeposits(address) view returns (uint256)",
  "function depositTimestamps(address) view returns (uint256)",
  "function LOCK_PERIOD() view returns (uint256)",
];

// Update the subgraph endpoint with your actual deployed subgraph URL
const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/113076/gigalottosepolia/version/latest";

// Add debugging for subgraph connection
console.log("🔍 Subgraph URL configured:", SUBGRAPH_URL);
console.log("📍 Contract address:", contractAddress);

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

// Test subgraph connection first
export async function testSubgraphConnection() {
  console.log("🧪 Testing subgraph connection...");

  try {
    const testQuery = `{ _meta { block { number } } }`;

    const response = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: testQuery }),
    });

    console.log("📡 Subgraph response status:", response.status);

    if (!response.ok) {
      console.error(
        "❌ Subgraph not accessible:",
        response.status,
        response.statusText
      );
      return false;
    }

    const data = await response.json();
    console.log("✅ Subgraph connection successful:", data);

    if (data.errors) {
      console.error("❌ Subgraph returned errors:", data.errors);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Subgraph connection failed:", error);
    return false;
  }
}

// Load jackpot info with optimized approach
export async function loadJackpotInfo() {
  console.log("Loading jackpot info...");
  console.log("Using contract address:", contractAddress);

  // Test subgraph connection first
  const subgraphWorking = await testSubgraphConnection();
  if (!subgraphWorking) {
    console.log(
      "⚠️ Subgraph not working, falling back to direct contract calls"
    );
    return await tryDirectContractCall();
  }

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

    const query = `{
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
    }`;

    console.log("Query:", query);

    const response = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query }),
    });

    console.log("Subgraph response status:", response.status);

    if (!response.ok) {
      console.error(
        "Subgraph response not OK:",
        response.status,
        response.statusText
      );
      throw new Error(
        `Subgraph request failed: ${response.status} ${response.statusText}`
      );
    }

    const responseData = await response.json();
    console.log("Subgraph data received:", responseData);

    if (responseData && responseData.data) {
      const { contract, newDeposits } = responseData.data;

      console.log("Contract data:", contract);
      console.log("New deposits data:", newDeposits);

      if (contract && contract.totalPool) {
        // Format values - ETH only, no USD
        const totalPoolEth = ethers.formatEther(contract.totalPool);

        // Calculate last 24h deposits in ETH from the deposits data
        const last24hEth = calculateLast24hDeposits(newDeposits);

        // Update UI with ETH-only data
        await updateUIWithEthData(totalPoolEth, last24hEth);

        // Process deposits for leaderboard
        let leaderboardData = [];
        let allDeposits = [];

        if (newDeposits && newDeposits.length > 0) {
          const deposits = newDeposits;

          // Group by depositor
          const depositorMap = {};
          deposits.forEach((deposit) => {
            const address = deposit.depositor;
            const amount = ethers.formatEther(deposit.amount);

            if (!depositorMap[address]) {
              depositorMap[address] = {
                address,
                amount: 0,
                timestamp: Number(deposit.blockTimestamp),
              };
            }

            depositorMap[address].amount += parseFloat(amount);
          });

          // Convert to array and sort
          leaderboardData = Object.values(depositorMap)
            .sort((a, b) => b.amount - a.amount)
            .map((entry) => ({
              ...entry,
              amount: entry.amount.toFixed(6),
            }));

          // Cache all deposits for timeframe filtering
          allDeposits = deposits.map((d) => ({
            depositor: d.depositor,
            amount: ethers.formatEther(d.amount),
            timestamp: Number(d.blockTimestamp),
          }));
        } else {
          console.log("No deposits found in subgraph data");
        }

        // Get current balances for accurate leaderboard (with improved rate limiting)
        try {
          const currentBalancesLeaderboard =
            await getCurrentBalancesLeaderboard(newDeposits);

          if (
            currentBalancesLeaderboard &&
            currentBalancesLeaderboard.length > 0
          ) {
            // Use current balances (shows actual withdrawable amounts)
            updateLeaderboardFromData(currentBalancesLeaderboard.slice(0, 10));
          } else {
            // Fallback to deposit history if current balances failed
            updateLeaderboardFromData(leaderboardData.slice(0, 10));
          }
        } catch (e) {
          console.warn("Current balances failed, using deposit history:", e);
          // Fallback to deposit history
          updateLeaderboardFromData(leaderboardData.slice(0, 10));
        }

        // Cache the data - ETH only
        const cacheData = {
          timestamp: Date.now(),
          totalPoolEth,
          last24hEth,
          topDepositors: leaderboardData.slice(0, 10),
          allDeposits,
        };

        localStorage.setItem("contractData", JSON.stringify(cacheData));

        // Hide error message if it was showing
        showDataError(false);

        return true;
      } else {
        console.log(
          "No contract data found in subgraph, trying direct contract call"
        );
        return await tryDirectContractCall();
      }
    } else if (responseData && responseData.errors) {
      console.error("Subgraph returned errors:", responseData.errors);
      return await tryDirectContractCall();
    }

    // If we get here, subgraph returned data but not in expected format
    console.error("Subgraph data format unexpected:", responseData);
    return await tryDirectContractCall();
  } catch (e) {
    console.error("Error fetching from subgraph:", e);
    // If we get here, subgraph failed, try direct contract call
    return await tryDirectContractCall();
  }
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

      // Update UI with ETH data only
      const totalPoolEth = ethers.formatEther(totalPool);

      // Simple ETH-only display
      document.getElementById(
        "jackpot"
      ).innerHTML = `<strong>${totalPoolEth} ETH</strong>`;

      // Set 24h deposits to 0 for now (will be calculated from subgraph data)
      const eth24hElement = document.getElementById("eth24h");
      if (eth24hElement) {
        eth24hElement.innerText = "0.000000";
      }

      // Update progress bar with actual target
      await updateProgressBar(totalPoolEth);

      // Update progress text with USD value
      const progressText = document.getElementById("progressText");
      if (progressText) {
        try {
          const jackpotUsd = await contract.getJackpotUsd();
          const usdValue = (Number(jackpotUsd) / 1e8).toFixed(2);
          progressText.textContent = `$${usdValue} USD`;
        } catch (e) {
          progressText.textContent = `${totalPoolEth} ETH`;
        }
      }

      // Cache the simple data
      const cacheData = {
        timestamp: Date.now(),
        totalPoolEth,
        last24hEth: "0.000000",
      };

      localStorage.setItem("contractData", JSON.stringify(cacheData));

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

// Calculate last 24h deposits in ETH
function calculateLast24hDeposits(deposits) {
  if (!deposits || deposits.length === 0) {
    console.log("No deposits data for 24h calculation");
    return "0.000000";
  }

  console.log("Calculating 24h deposits from:", deposits);

  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 24 * 60 * 60;

  console.log("Current time:", now);
  console.log("24h ago:", oneDayAgo);

  let total = 0;
  deposits.forEach((deposit, index) => {
    const depositTime = Number(deposit.blockTimestamp);
    const amount = parseFloat(ethers.formatEther(deposit.amount));

    console.log(`Deposit ${index}:`, {
      depositTime,
      amount,
      isWithin24h: depositTime >= oneDayAgo,
      timeAgo: (now - depositTime) / 3600 + " hours ago",
    });

    if (depositTime >= oneDayAgo) {
      total += amount;
    }
  });

  console.log("Total 24h deposits:", total.toFixed(6), "ETH");
  return total.toFixed(6);
}

// Get current balances for leaderboard (after withdrawals and fees)
async function getCurrentBalancesLeaderboard(deposits) {
  if (!deposits || deposits.length === 0) return [];

  try {
    const provider = new ethers.JsonRpcProvider(
      "https://eth-sepolia.public.blastapi.io"
    );
    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Get unique depositors (limit to top 10 to avoid rate limiting)
    const uniqueDepositors = [
      ...new Set(deposits.map((d) => d.depositor)),
    ].slice(0, 10);
    console.log(
      "Getting current balances for",
      uniqueDepositors.length,
      "depositors (limited to avoid rate limits)"
    );

    // Process in smaller batches with longer delays to avoid rate limiting
    const batchSize = 3;
    const validBalances = [];

    for (let i = 0; i < uniqueDepositors.length; i += batchSize) {
      const batch = uniqueDepositors.slice(i, i + batchSize);

      const balancePromises = batch.map(async (address, index) => {
        try {
          // Stagger calls within batch
          await new Promise((resolve) => setTimeout(resolve, index * 200));

          // Get withdrawable amount (total deposits minus withdrawals, ignoring fees)
          const withdrawableAmount = await contract.withdrawableAmounts(
            address
          );
          const balance = parseFloat(ethers.formatEther(withdrawableAmount));

          if (balance > 0) {
            return {
              address,
              amount: balance.toFixed(6),
              timestamp: Math.floor(Date.now() / 1000),
            };
          }
          return null;
        } catch (e) {
          console.warn("Error getting balance for", address, e);
          return null;
        }
      });

      const batchResults = await Promise.all(balancePromises);
      validBalances.push(...batchResults.filter((b) => b !== null));

      // Longer delay between batches
      if (i + batchSize < uniqueDepositors.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Sort by amount
    validBalances.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

    console.log("Current balances leaderboard:", validBalances);
    return validBalances;
  } catch (error) {
    console.error("Error getting current balances:", error);
    // Fallback to deposit history if contract calls fail
    return getDepositHistoryLeaderboard(deposits);
  }
}

// Fallback: Get leaderboard from deposit history (old method)
function getDepositHistoryLeaderboard(deposits) {
  const depositorMap = {};
  deposits.forEach((deposit) => {
    const address = deposit.depositor;
    const amount = ethers.formatEther(deposit.amount);

    if (!depositorMap[address]) {
      depositorMap[address] = {
        address,
        amount: 0,
        timestamp: Number(deposit.blockTimestamp),
      };
    }

    depositorMap[address].amount += parseFloat(amount);
  });

  return Object.values(depositorMap)
    .sort((a, b) => b.amount - a.amount)
    .map((entry) => ({
      ...entry,
      amount: entry.amount.toFixed(6),
    }));
}

// Helper function to update UI with ETH-only data
async function updateUIWithEthData(totalPoolEth, last24hEth) {
  console.log("UI updated with ETH data:", {
    totalPoolEth,
    last24hEth,
  });

  // Only update jackpot display if value changed - ETH only
  const jackpotElement = document.getElementById("jackpot");
  const newJackpotContent = `<strong>${totalPoolEth} ETH</strong>`;
  if (jackpotElement && jackpotElement.innerHTML !== newJackpotContent) {
    jackpotElement.innerHTML = newJackpotContent;
  }

  // Update 24h deposits in ETH
  const eth24hElement = document.getElementById("eth24h");
  if (eth24hElement && eth24hElement.innerText !== last24hEth) {
    eth24hElement.innerText = last24hEth;
  }

  // Get actual target from contract and calculate progress (pass USD values to avoid extra API calls)
  await updateProgressBar(totalPoolEth);
}

// Function to get target and update progress bar
async function updateProgressBar(
  totalPoolEth,
  jackpotUsd = null,
  targetUsd = null
) {
  try {
    // Try to get target from contract
    let targetEth = 10; // Default fallback

    // Try to get target from contract
    try {
      const provider = new ethers.JsonRpcProvider(
        "https://eth-sepolia.public.blastapi.io"
      );
      const contract = new ethers.Contract(contractAddress, abi, provider);

      // Get target USD and current ETH price to convert to ETH
      const targetUsd = await contract.TARGET_USD();
      const jackpotUsd = await contract.getJackpotUsd();

      // Calculate ETH equivalent of target (rough estimation)
      if (Number(jackpotUsd) > 0 && Number(targetUsd) > 0) {
        const currentEthPrice =
          Number(jackpotUsd) / parseFloat(totalPoolEth) / 1e8;
        targetEth = Number(targetUsd) / 1e8 / currentEthPrice;
        console.log("📊 Calculated target:", targetEth.toFixed(6), "ETH");
      }
    } catch (e) {
      console.log("Using fallback target of 10 ETH");
    }

    const percentComplete = (parseFloat(totalPoolEth) / targetEth) * 100;

    // Update progress bar with animation
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");

    if (progressFill) {
      const newWidth = `${Math.min(percentComplete, 100)}%`;
      if (progressFill.style.width !== newWidth) {
        progressFill.style.width = newWidth;
        progressFill.setAttribute(
          "data-percent",
          Math.min(percentComplete, 100).toFixed(1)
        );
      }
    }

    if (progressText) {
      // Calculate USD value of current pool
      try {
        const provider = new ethers.JsonRpcProvider(
          "https://eth-sepolia.public.blastapi.io"
        );
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const jackpotUsd = await contract.getJackpotUsd();
        const usdValue = (Number(jackpotUsd) / 1e8).toFixed(2);
        progressText.textContent = `$${usdValue} USD`;
      } catch (e) {
        // Fallback to ETH display if USD fetch fails
        progressText.textContent = `${parseFloat(totalPoolEth).toFixed(6)} ETH`;
      }
    }
  } catch (error) {
    console.error("Error updating progress bar:", error);
  }
}

// Use cached data if available
async function useCachedDataIfAvailable() {
  const cachedData = localStorage.getItem("contractData");
  if (cachedData) {
    try {
      const data = JSON.parse(cachedData);
      console.log("Using cached data from", new Date(data.timestamp));

      await updateUIWithEthData(
        data.totalPoolEth || "0",
        data.last24hEth || "0.000000"
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
async function updateLeaderboardFromData(
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

  if (!topDepositors || topDepositors.length === 0) {
    leaderboardEl.innerHTML = `
      <div class="leaderboard-row empty">
        <span colspan="3">No deposits for this timeframe</span>
      </div>
    `;
    return;
  }

  // Check if this is the first load or if depositors have changed
  const currentAddresses = topDepositors.map((d) => d.address).join(",");
  const lastAddresses = leaderboardEl.getAttribute("data-last-addresses") || "";

  if (currentAddresses === lastAddresses) {
    // Same depositors, no need to reload
    console.log("Depositors unchanged, skipping update");
    return;
  }

  // Show loading state with spinning dots while resolving ENS names
  leaderboardEl.innerHTML = `
    <div class="leaderboard-row empty">
      <span colspan="3">
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </span>
    </div>
  `;

  // Re-enable ENS resolution
  const depositorsWithENS = await resolveENSNamesBeforeDisplay(topDepositors);

  let html = ``;
  depositorsWithENS.forEach((entry, index) => {
    // Use ENS name if available, otherwise format address
    const displayName =
      entry.ensName ||
      `${entry.address.substring(0, 6)}...${entry.address.substring(38)}`;
    const title = entry.ensName
      ? `${entry.ensName} (${entry.address})`
      : entry.address;

    html += `
      <div class="leaderboard-row">
        <span class="leaderboard-rank">${index + 1}</span>
        <a
          id="leaderboard-address-${index}"
          class="leaderboard-address"
          href="https://sepolia.etherscan.io/address/${entry.address}"
          target="_blank"
          data-address="${entry.address}"
          title="${title}"
        >${displayName}</a>
        <span class="leaderboard-amount">${parseFloat(entry.amount).toFixed(
          4
        )} ETH</span>
      </div>
    `;
  });

  leaderboardEl.innerHTML = html;

  // Store the current addresses to avoid unnecessary updates
  leaderboardEl.setAttribute("data-last-addresses", currentAddresses);
}

// ENS Cache Management
function getENSCache() {
  try {
    const cache = localStorage.getItem("ensCache");
    return cache ? JSON.parse(cache) : {};
  } catch (e) {
    console.error("Error reading ENS cache:", e);
    return {};
  }
}

function setENSCache(cache) {
  try {
    localStorage.setItem("ensCache", JSON.stringify(cache));
  } catch (e) {
    console.error("Error saving ENS cache:", e);
  }
}

function getCachedENS(address) {
  const cache = getENSCache();
  const cached = cache[address.toLowerCase()];

  if (cached) {
    // Check if cache is still valid (24 hours)
    const now = Date.now();
    if (now - cached.timestamp < 24 * 60 * 60 * 1000) {
      return cached.ensName;
    }
  }

  return null;
}

function setCachedENS(address, ensName) {
  const cache = getENSCache();
  cache[address.toLowerCase()] = {
    ensName: ensName || null,
    timestamp: Date.now(),
  };
  setENSCache(cache);
}

// Resolve ENS names before displaying (to prevent address->ENS flashing)
async function resolveENSNamesBeforeDisplay(topDepositors) {
  if (!topDepositors || topDepositors.length === 0) {
    return [];
  }

  console.log("Resolving ENS names before display for:", topDepositors);

  // First, check cache for all addresses
  const depositorsWithCachedENS = topDepositors.map((depositor) => {
    const cachedENS = getCachedENS(depositor.address);
    return {
      ...depositor,
      ensName: cachedENS,
      needsResolution: cachedENS === null,
    };
  });

  // Filter addresses that need resolution
  const needResolution = depositorsWithCachedENS.filter(
    (d) => d.needsResolution
  );

  if (needResolution.length === 0) {
    console.log("All ENS names found in cache!");
    return depositorsWithCachedENS;
  }

  console.log(`Resolving ${needResolution.length} ENS names not in cache`);

  try {
    // Use only working CORS-friendly RPC endpoints for Sepolia
    const rpcEndpoints = [
      "https://eth-sepolia.public.blastapi.io", // This works without CORS
      "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // Public Infura backup
    ];

    let provider;
    let connected = false;

    // Try each endpoint until one works
    for (const endpoint of rpcEndpoints) {
      try {
        console.log(`Trying RPC endpoint for ENS: ${endpoint}`);
        provider = new ethers.JsonRpcProvider(endpoint);

        // Test the connection
        await provider.getBlockNumber();
        console.log(`Connected to RPC for ENS resolution: ${endpoint}`);

        connected = true;
        break;
      } catch (rpcError) {
        console.error(`Failed to connect to ${endpoint} for ENS:`, rpcError);
      }
    }

    if (!connected) {
      console.warn("Failed to connect to any RPC endpoint for ENS resolution");
      return depositorsWithCachedENS; // Return data with cached ENS names
    }

    // Resolve ENS names for addresses not in cache
    // Use Sepolia network for ENS resolution since we're on Sepolia testnet
    const resolutionPromises = needResolution.map(async (depositor, index) => {
      const address = depositor.address;
      if (!address) return depositor;

      // Add staggered delay to prevent rate limiting (500ms between requests)
      await new Promise((resolve) => setTimeout(resolve, index * 500));

      try {
        // Use the same provider that's already connected and working
        // Add timeout to prevent hanging
        const ensName = await Promise.race([
          provider.lookupAddress(address),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("ENS lookup timeout")), 5000)
          ),
        ]);

        // Cache the result (even if null)
        setCachedENS(address, ensName);

        if (ensName) {
          console.log(`✅ Found ENS name for ${address}: ${ensName}`);
        }

        return {
          ...depositor,
          ensName: ensName || null,
          needsResolution: false,
        };
      } catch (error) {
        // If we get a rate limit error, try the backup provider
        if (
          error.message.includes("429") ||
          error.message.includes("rate limit") ||
          error.code === 429
        ) {
          console.warn(
            `⚠️ Rate limited, trying backup provider for ${address}`
          );
          try {
            const backupProvider = new ethers.JsonRpcProvider(
              "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
            );
            const ensName = await Promise.race([
              backupProvider.lookupAddress(address),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Backup ENS lookup timeout")),
                  5000
                )
              ),
            ]);

            setCachedENS(address, ensName);
            if (ensName) {
              console.log(
                `✅ Found ENS name via backup for ${address}: ${ensName}`
              );
            }

            return {
              ...depositor,
              ensName: ensName || null,
              needsResolution: false,
            };
          } catch (backupError) {
            console.warn(`⚠️ Backup ENS lookup also failed for ${address}`);
          }
        } else {
          console.warn(`⚠️ ENS lookup failed for ${address}:`, error.message);
        }

        // Cache null result to avoid repeated failures
        setCachedENS(address, null);
        return {
          ...depositor,
          ensName: null,
          needsResolution: false,
        };
      }
    });

    const resolvedDepositors = await Promise.all(resolutionPromises);

    // Merge cached and resolved results
    const finalResult = depositorsWithCachedENS.map((depositor) => {
      if (depositor.needsResolution) {
        const resolved = resolvedDepositors.find(
          (r) => r.address === depositor.address
        );
        return resolved || depositor;
      }
      return depositor;
    });

    console.log("ENS resolution complete with caching");
    return finalResult;
  } catch (error) {
    console.error("Error setting up ENS resolution:", error);
    return depositorsWithCachedENS; // Return data with cached ENS names
  }
}

// Fix ENS name resolution to use Sepolia testnet
async function resolveENSNames(topDepositors) {
  if (!topDepositors || topDepositors.length === 0) {
    console.log("No depositors to resolve ENS names for");
    return;
  }

  console.log("Resolving ENS names for:", topDepositors);

  try {
    // Use only reliable Sepolia testnet RPC endpoints
    const rpcEndpoints = ["https://rpc.sepolia.org"];

    let provider;
    let connected = false;

    // Try each endpoint until one works
    for (const endpoint of rpcEndpoints) {
      try {
        console.log(`Trying Sepolia RPC endpoint for ENS: ${endpoint}`);
        provider = new ethers.JsonRpcProvider(endpoint);

        // Test the connection
        await provider.getBlockNumber();
        console.log(`Connected to Sepolia RPC for ENS resolution: ${endpoint}`);

        connected = true;
        break;
      } catch (rpcError) {
        console.error(`Failed to connect to ${endpoint} for ENS:`, rpcError);
      }
    }

    if (!connected) {
      throw new Error(
        "Failed to connect to any Sepolia RPC endpoint for ENS resolution"
      );
    }

    // Process each depositor
    for (let i = 0; i < topDepositors.length; i++) {
      const address = topDepositors[i].address;
      if (!address) continue;

      const addressElement = document.getElementById(
        `leaderboard-address-${i}`
      );
      if (!addressElement) continue;

      console.log(`Looking up ENS for ${address} on Sepolia`);

      try {
        // For Sepolia, we need to use a different approach since ENS on testnets works differently
        // First check if the address has a .eth name on Sepolia
        const ensName = await provider.lookupAddress(address);

        if (ensName) {
          console.log(`Found ENS name for ${address} on Sepolia: ${ensName}`);
          addressElement.innerText = ensName;
          addressElement.title = address;
        } else {
          // If no ENS name on Sepolia, try to check if this address has a .eth name on mainnet
          // This is just for display purposes since many users have ENS names on mainnet
          try {
            const mainnetProvider = new ethers.JsonRpcProvider(
              "https://cloudflare-eth.com"
            );
            const mainnetEnsName = await mainnetProvider.lookupAddress(address);

            if (mainnetEnsName) {
              console.log(
                `Found mainnet ENS name for ${address}: ${mainnetEnsName}`
              );
              addressElement.innerText = mainnetEnsName;
              addressElement.title = address + " (Mainnet ENS)";
            } else {
              console.log(`No ENS name found for ${address} on any network`);
            }
          } catch (mainnetError) {
            console.error(
              `Error checking mainnet ENS for ${address}:`,
              mainnetError
            );
          }
        }
      } catch (error) {
        console.error(`Error resolving ENS for ${address} on Sepolia:`, error);
      }
    }
  } catch (error) {
    console.error("Error setting up ENS resolution:", error);
  }
}

// Helper function to shorten addresses
function shortenAddress(address) {
  if (!address) return "";
  return (
    address.substring(0, 6) + "..." + address.substring(address.length - 4)
  );
}

// Add a function to manually trigger ENS resolution
window.refreshENSNames = async function () {
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

// Temporarily disable automatic ENS refresh to avoid rate limiting
// setTimeout(window.refreshENSNames, 2000);

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
    statusEl.innerText =
      "🔥 JACKPOT READY! Next deposit will trigger winner selection!";
    statusEl.className = "status-ready";
  } else if (percentComplete >= 90) {
    statusEl.innerText = "🔥 Almost there! Jackpot is nearly ready!";
    statusEl.className = "status-almost";
  } else if (percentComplete >= 50) {
    statusEl.innerText = "🚀 Jackpot is growing fast!";
    statusEl.className = "status-growing";
  } else {
    statusEl.innerText = "💰 Jackpot is building up!";
    statusEl.className = "status-building";
  }
}

// Set up auto-refresh
// Load data only on user actions - no auto-refresh
export function loadInitialData() {
  console.log("Loading initial data...");
  loadJackpotInfo();
}

// Function to refresh data manually (called on user actions)
export function refreshData() {
  console.log("Refreshing data due to user action...");

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

    // Sort by amount (descending)
    leaderboardData.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

    // Update leaderboard with filtered data
    updateLeaderboardFromData(leaderboardData.slice(0, 10), timeframe);

    // Save selected timeframe
    localStorage.setItem("selectedTimeframe", timeframe);
  } catch (error) {
    console.error("Error filtering by timeframe:", error);
  }
}

// Make sure the changeTimeframe function is available globally
window.changeTimeframe = changeTimeframe;

// Import the debugWalletConnection function from wallet.js
import { debugWalletConnection } from "./wallet.js";

// Initialize read-only functionality
export async function initializeReadOnly() {
  console.log("Initializing read-only functionality");

  // Load initial data (no auto-refresh)
  loadInitialData();

  // Make the function available globally
  window.initializeReadOnly = initializeReadOnly;
  window.refreshData = refreshData;
}

// Make loadJackpotInfo available globally
window.loadJackpotInfo = loadJackpotInfo;

// Call initializeReadOnly when the script loads
document.addEventListener("DOMContentLoaded", initializeReadOnly);
