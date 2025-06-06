import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

// Contract details - export so they can be imported in read-only.js
export const contractAddress = "0xd466628a48437394ac7a58ca8CaF48E3Ce22733B"; // New contract with withdrawal functionality
export const abi = [
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function withdrawIfWinner() external",
  "function selectNewWinner() external",
  "function requestDraw() external",
  "function withdrawFees() external",
  "function userDeposits(address) view returns (uint256)",
  "function withdrawableAmounts(address) view returns (uint256)",
  "function depositTimestamps(address) view returns (uint256)",
  "function LOCK_PERIOD() view returns (uint256)",
  "function totalPool() view returns (uint256)",
  "function getJackpotUsd() view returns (uint256)",
  "function TARGET_USD() view returns (uint256)",
  "function canDraw() view returns (bool)",
  "function winner() view returns (address)",
  "function winnerSelectedAt() view returns (uint256)",
  "function WINNER_CLAIM_PERIOD() view returns (uint256)",
  "function owner() view returns (address)",
  "function getEntriesCount() view returns (uint256)",
  "function getEntry(uint256) view returns (address, uint256)",
  "function collectedFees() view returns (uint256)",
  "function last24hDepositUsd() view returns (uint256)",
  "event WinnerSelectionExpired(address indexed previousWinner)",
];

// Global variables
let provider = null;
let signer = null;
let userAccount = null;
let contract = null;

// Get user account
export function getUserAccount() {
  return userAccount;
}

// Initialize Web3
export async function initWeb3() {
  console.log("Initializing Web3...");
  if (!window.ethereum) {
    document.getElementById("status").innerText = "⚠️ Please install MetaMask.";
    return false;
  }

  try {
    // Show connecting status
    document.getElementById("status").innerText = "⏳ Connecting wallet...";

    // Check if we're on Sepolia
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    console.log("Current chain ID:", chainId);

    // Sepolia chain ID is 0xaa36a7 (11155111 in decimal)
    if (chainId !== "0xaa36a7") {
      console.log("Not on Sepolia, requesting network switch");
      document.getElementById("status").innerText =
        "⏳ Switching to Sepolia testnet...";

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0xaa36a7",
                  chainName: "Sepolia Testnet",
                  nativeCurrency: {
                    name: "Sepolia ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["https://rpc.sepolia.org"],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
              ],
            });
          } catch (addError) {
            console.error("Error adding Sepolia network:", addError);
            document.getElementById("status").innerText =
              "⚠️ Failed to add Sepolia network.";
            return false;
          }
        } else {
          console.error("Error switching to Sepolia:", switchError);
          document.getElementById("status").innerText =
            "⚠️ Failed to switch to Sepolia.";
          return false;
        }
      }
    }

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAccount = await signer.getAddress();
    console.log("Connected to account:", userAccount);

    contract = new ethers.Contract(contractAddress, abi, signer);

    // Only update UI after successful connection
    document.getElementById("status").innerText =
      "✅ Wallet connected to Sepolia!";
    document.getElementById("userDashboard").style.display = "block";

    // Change connect button to deposit button
    const connectBtn = document.getElementById("connectBtn");
    const depositBtn = document.getElementById("depositBtn");

    if (connectBtn) {
      connectBtn.style.display = "none";
    }

    if (depositBtn) {
      depositBtn.style.display = "inline-block";
    }

    await updateUI();
    return true;
  } catch (e) {
    console.error("Init error:", e);
    document.getElementById("status").innerText =
      "⚠️ Connection failed: " + e.message;
    return false;
  }
}

// Handle deposits
let isDepositing = false;
export async function connectAndDeposit() {
  if (isDepositing) {
    console.log("Deposit already in progress, ignoring duplicate click");
    return;
  }

  try {
    isDepositing = true;
    // Get the amount from the input
    const amountInput = document.getElementById("ethAmount");
    const amount = amountInput.value;

    // Validate amount
    if (!amount || parseFloat(amount) < 0.001) {
      document.getElementById("status").innerText =
        "⚠️ Minimum deposit is 0.001 ETH";
      return;
    }

    // Check if wallet is connected
    if (!userAccount) {
      const connected = await connectWallet();
      if (!connected) {
        document.getElementById("status").innerText =
          "⚠️ Please connect your wallet first";
        return;
      }
    }

    document.getElementById("status").innerText = "⏳ Confirming deposit...";

    // Convert amount to wei
    const amountWei = ethers.parseEther(amount);

    // Send transaction
    const tx = await contract.deposit({ value: amountWei });
    const statusEl = document.getElementById("status");
    statusEl.innerText = "🔥 TRANSACTION SENT! CONFIRMING...";
    statusEl.className = "hot-flame";

    // Wait for confirmation
    await tx.wait();
    const statusEl = document.getElementById("status");
    statusEl.innerText = "✅ Deposit successful!";
    statusEl.className = ""; // Remove hot-flame class

    // Trigger confetti effect
    triggerConfetti();

    // Show share modal after a short delay
    setTimeout(() => {
      const shareModal = document.getElementById("shareModal");
      if (shareModal && shareModal.showModal) {
        shareModal.showModal();
      }
    }, 1000);

    // Update UI and refresh data
    updateUI();

    // Refresh data from subgraph/contract
    if (window.refreshData) {
      window.refreshData();
    }
  } catch (e) {
    console.error("Deposit error:", e);

    // Check if user rejected the transaction
    if (
      e.code === 4001 ||
      e.message.includes("user rejected") ||
      e.message.includes("User denied")
    ) {
      document.getElementById("status").innerText =
        "⚠️ Deposit cancelled: User rejected transaction";
    } else {
      document.getElementById("status").innerText =
        "⚠️ Deposit failed: " + e.message;
    }
  } finally {
    isDepositing = false;
  }
}

// Make connectAndDeposit available globally
window.connectAndDeposit = connectAndDeposit;

// Handle withdrawals
export async function withdrawWinnings() {
  try {
    document.getElementById("status").innerText = "⏳ Claiming your prize...";
    const tx = await contract.withdrawIfWinner();
    await tx.wait();

    document.getElementById("status").innerHTML =
      '<div class="winner-banner">✅ $2.2B CLAIMED! HISTORY MADE!</div>';

    // Show confetti effect
    triggerConfetti();
  } catch (e) {
    console.error("Withdraw error:", e);

    // Check if user rejected the transaction
    if (
      e.code === 4001 ||
      e.message.includes("user rejected") ||
      e.message.includes("User denied")
    ) {
      document.getElementById("status").innerText =
        "⚠️ Claim cancelled: User rejected transaction";
    } else {
      document.getElementById("status").innerText =
        "⚠️ Claim failed: " + e.message;
    }
  }
}

// Handle regular withdrawals
export async function withdraw(amount) {
  try {
    if (!amount) {
      // Get the withdrawable amount if not provided
      const withdrawable = await contract.withdrawableAmounts(userAccount);
      amount = withdrawable;
    }

    if (amount === 0n) {
      document.getElementById("status").innerText =
        "⚠️ No funds available to withdraw";
      return;
    }

    document.getElementById("status").innerText = "⏳ Withdrawing funds...";
    const tx = await contract.withdraw(amount);
    await tx.wait();
    document.getElementById("status").innerText = "✅ Withdrawal successful!";
    updateUI();

    // Refresh data from subgraph/contract
    if (window.refreshData) {
      window.refreshData();
    }
  } catch (e) {
    console.error("Withdraw error:", e);

    // Check if user rejected the transaction
    if (
      e.code === 4001 ||
      e.message.includes("user rejected") ||
      e.message.includes("User denied")
    ) {
      document.getElementById("status").innerText =
        "⚠️ Withdrawal cancelled: User rejected transaction";
    } else {
      document.getElementById("status").innerText =
        "⚠️ Withdrawal failed: " + e.message;
    }
  }
}

// Handle draw requests
export async function requestDraw() {
  try {
    document.getElementById("status").innerText = "⏳ Requesting draw...";
    const tx = await contract.requestDraw();
    await tx.wait();
    document.getElementById("status").innerText = "✅ Draw requested!";
    updateUI();
  } catch (e) {
    console.error("Draw error:", e);

    // Check if user rejected the transaction
    if (
      e.code === 4001 ||
      e.message.includes("user rejected") ||
      e.message.includes("User denied")
    ) {
      document.getElementById("status").innerText =
        "⚠️ Draw cancelled: User rejected transaction";
    } else {
      document.getElementById("status").innerText =
        "⚠️ Draw failed: " + e.message;
    }
  }
}

// Update UI with user data
export async function updateUI() {
  if (!contract || !userAccount) return;

  try {
    // Get user deposit
    const deposit = await contract.userDeposits(userAccount);

    // Get total pool
    const totalPool = await contract.totalPool();

    // Get withdrawable amount and check lock period
    let withdrawable = 0n;
    let canWithdraw = false;
    let timeUntilUnlock = 0;

    try {
      console.log("Checking withdrawable amounts for user:", userAccount);
      withdrawable = await contract.withdrawableAmounts(userAccount);
      console.log("Raw withdrawable amount (Wei):", withdrawable.toString());
      console.log(
        "Withdrawable amount (ETH):",
        ethers.formatEther(withdrawable)
      );

      // Also check userDeposits for comparison
      const userDepositsAmount = await contract.userDeposits(userAccount);
      console.log("User deposits amount (Wei):", userDepositsAmount.toString());
      console.log(
        "User deposits amount (ETH):",
        ethers.formatEther(userDepositsAmount)
      );

      if (withdrawable > 0n) {
        // Check if lock period has passed
        const depositTimestamp = await contract.depositTimestamps(userAccount);
        const lockPeriod = await contract.LOCK_PERIOD();
        const currentTime = Math.floor(Date.now() / 1000);
        const unlockTime = Number(depositTimestamp) + Number(lockPeriod);

        canWithdraw = currentTime >= unlockTime;
        timeUntilUnlock = Math.max(0, unlockTime - currentTime);

        console.log("Deposit timestamp:", Number(depositTimestamp));
        console.log("Lock period:", Number(lockPeriod), "seconds");
        console.log("Current time:", currentTime);
        console.log("Unlock time:", unlockTime);
      } else {
        console.warn("No withdrawable amount found. This could mean:");
        console.warn("1. User has no deposits");
        console.warn("2. User already withdrew everything");
        console.warn(
          "3. Deposit was made before withdrawableAmounts was implemented"
        );
        console.warn("4. There's an issue with the contract state");
      }

      if (withdrawable > 0n) {
        console.log("Withdrawal check:", {
          withdrawable: ethers.formatEther(withdrawable),
          depositTimestamp: Number(depositTimestamp),
          lockPeriod:
            Number(lockPeriod) +
            " seconds (" +
            Number(lockPeriod) / 60 +
            " minutes)",
          currentTime,
          unlockTime,
          canWithdraw,
          timeUntilUnlock:
            timeUntilUnlock +
            " seconds (" +
            (timeUntilUnlock / 60).toFixed(1) +
            " minutes)",
        });
      }
    } catch (e) {
      console.error("Error checking withdrawable amounts:", e);
      console.log(
        "Attempting fallback: using userDeposits as withdrawable amount"
      );

      // Fallback: if withdrawableAmounts fails, use userDeposits
      // This handles cases where deposits were made before withdrawableAmounts was implemented
      try {
        const userDepositsAmount = await contract.userDeposits(userAccount);
        if (userDepositsAmount > 0n) {
          console.log("Using userDeposits as fallback withdrawable amount");
          withdrawable = userDepositsAmount;

          // Still check lock period
          const depositTimestamp = await contract.depositTimestamps(
            userAccount
          );
          const lockPeriod = await contract.LOCK_PERIOD();
          const currentTime = Math.floor(Date.now() / 1000);
          const unlockTime = Number(depositTimestamp) + Number(lockPeriod);

          canWithdraw = currentTime >= unlockTime;
          timeUntilUnlock = Math.max(0, unlockTime - currentTime);

          console.log("Fallback withdrawal check:", {
            withdrawable: ethers.formatEther(withdrawable),
            canWithdraw,
            timeUntilUnlock: timeUntilUnlock + " seconds",
          });
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
    }

    // Calculate win chance
    let winChance = 0;
    if (totalPool > 0) {
      winChance = (Number(deposit) / Number(totalPool)) * 100;
    }

    // Format win chance for display
    let winChanceDisplay = winChance.toFixed(6) + "%";
    if (winChance < 0.000001 && winChance > 0) {
      winChanceDisplay = "< 0.000001%";
    }

    // Update user dashboard with better precision
    document.getElementById("userAddress").innerText = `${userAccount.slice(
      0,
      6
    )}...${userAccount.slice(-4)}`;

    // Show more decimal places for small amounts
    const depositFormatted = Number(ethers.formatEther(deposit)).toFixed(8);
    document.getElementById("userDeposit").innerText = depositFormatted;
    document.getElementById("winChance").innerText = winChanceDisplay;

    // Update withdrawable amount if element exists with better precision
    const withdrawableEl = document.getElementById("withdrawableAmount");
    if (withdrawableEl) {
      const withdrawableFormatted = Number(
        ethers.formatEther(withdrawable)
      ).toFixed(8);
      withdrawableEl.innerText = withdrawableFormatted;
      console.log(
        "Updated withdrawable amount display:",
        withdrawableFormatted
      );
    }

    // Show withdrawal section and update status
    const withdrawalSection = document.getElementById("withdrawalSection");
    const withdrawBtn = document.getElementById("withdrawFundsBtn"); // Correct ID from HTML
    const withdrawStatus = document.getElementById("withdrawStatus");

    if (withdrawalSection) {
      if (Number(withdrawable) > 0) {
        withdrawalSection.style.display = "block";

        if (canWithdraw) {
          if (withdrawBtn) {
            withdrawBtn.style.display = "inline-block";
            withdrawBtn.disabled = false;
            withdrawBtn.innerText = `Withdraw ${ethers.formatEther(
              withdrawable
            )} ETH`;
          }
          if (withdrawStatus) {
            withdrawStatus.innerText = "✅ Funds available for withdrawal";
            withdrawStatus.className = "status-ready";
          }
        } else {
          if (withdrawBtn) {
            withdrawBtn.style.display = "none";
          }
          if (withdrawStatus) {
            const minutes = Math.floor(timeUntilUnlock / 60);
            const seconds = timeUntilUnlock % 60;

            let timeText = "";
            if (minutes > 0) timeText += `${minutes}m `;
            if (seconds > 0 || minutes === 0) timeText += `${seconds}s`;

            withdrawStatus.innerText = `⏳ Funds locked for ${timeText}`;
            withdrawStatus.className = "status-waiting";
          }
        }
      } else {
        withdrawalSection.style.display = "none";
      }
    }

    document.getElementById("userDashboard").style.display = "block";

    // Check if user is winner
    await checkWinnerAndDraw();
  } catch (e) {
    console.error("UI update failed:", e);
  }
}

// Check if user is winner and if draw is possible
export async function checkWinnerAndDraw() {
  if (!contract || !userAccount) return;

  try {
    // Check if user is admin - hardcode the admin address for now
    const adminAddress = "0xe9D99D4380e80DE290D10F741F77728954fe2d81";
    const isUserAdmin =
      userAccount.toLowerCase() === adminAddress.toLowerCase();

    console.log("Admin check:", {
      userAccount,
      adminAddress,
      isAdmin: isUserAdmin,
    });

    if (isUserAdmin) {
      console.log("User is admin, showing admin section");

      // Get collected fees
      let collectedFees = "0";
      try {
        console.log("Fetching collected fees from contract...");
        console.log("Contract address:", contractAddress);
        console.log("Contract object:", contract);

        const feesWei = await contract.collectedFees();
        console.log("Fees in Wei:", feesWei.toString());

        collectedFees = ethers.formatEther(feesWei);
        console.log("Collected fees formatted:", collectedFees, "ETH");
      } catch (feeError) {
        console.error("Error getting collected fees:", feeError);
        console.error("Error details:", {
          message: feeError.message,
          code: feeError.code,
          data: feeError.data,
        });
      }

      // Show admin section
      let adminSection = document.getElementById("adminSection");
      console.log("Existing admin section found:", !!adminSection);

      if (!adminSection) {
        // Create admin section if it doesn't exist
        const dashboard = document.getElementById("userDashboard");
        console.log("User dashboard found:", !!dashboard);

        if (dashboard) {
          console.log("Creating admin section");
          const adminDiv = document.createElement("div");
          adminDiv.id = "adminSection";
          adminDiv.className = "admin-section";
          adminDiv.style.display = "block"; // Ensure it's visible

          adminDiv.innerHTML = `
            <h3>🔐 Admin Controls</h3>
            <div class="admin-info">
              <div class="admin-stat">
                <span>💰 Fees available for withdrawal:</span>
                <span id="collectedFees">${collectedFees} ETH</span>
              </div>
            </div>
            <div id="adminStatus">Checking draw status...</div>
            <div class="admin-buttons">
              <button id="checkDrawBtn" class="admin-btn">Check Draw Status</button>
              <button id="requestDrawBtn" class="admin-btn">Request Draw</button>
              <button id="selectNewWinnerBtn" class="admin-btn">Select New Winner</button>
              <button id="withdrawFeesBtn" class="admin-btn">Withdraw Fees (${collectedFees} ETH)</button>
              <button id="refreshFeesBtn" class="admin-btn">Refresh Fees</button>
            </div>
          `;

          console.log(
            "Admin section HTML created with fees:",
            collectedFees,
            "ETH"
          );
          dashboard.after(adminDiv);

          console.log("Admin section inserted into DOM");

          // Add event listeners for admin buttons
          setTimeout(() => {
            const checkDrawBtn = document.getElementById("checkDrawBtn");
            const requestDrawBtn = document.getElementById("requestDrawBtn");
            const selectNewWinnerBtn =
              document.getElementById("selectNewWinnerBtn");
            const withdrawFeesBtn = document.getElementById("withdrawFeesBtn");
            const refreshFeesBtn = document.getElementById("refreshFeesBtn");

            if (checkDrawBtn) {
              checkDrawBtn.addEventListener("click", async () => {
                console.log("Check Draw button clicked");
                await checkCanDraw();
              });
              checkDrawBtn.setAttribute("data-listener-added", "true");
            }

            if (requestDrawBtn) {
              requestDrawBtn.addEventListener("click", async () => {
                console.log("Request Draw button clicked");
                await requestDraw();
              });
              requestDrawBtn.setAttribute("data-listener-added", "true");
            }

            if (selectNewWinnerBtn) {
              selectNewWinnerBtn.addEventListener("click", async () => {
                console.log("Select New Winner button clicked");
                await selectNewWinner();
              });
              selectNewWinnerBtn.setAttribute("data-listener-added", "true");
            }

            if (withdrawFeesBtn) {
              withdrawFeesBtn.addEventListener("click", async () => {
                console.log("Withdraw Fees button clicked");
                await withdrawFees();
              });
              withdrawFeesBtn.setAttribute("data-listener-added", "true");
            }

            if (refreshFeesBtn) {
              refreshFeesBtn.addEventListener("click", async () => {
                console.log("Refresh Fees button clicked");
                await updateAdminFeesDisplay();
              });
              refreshFeesBtn.setAttribute("data-listener-added", "true");
            }

            console.log("Admin button event listeners added");
          }, 100);

          // Check if draw is possible
          await checkCanDraw();

          // Update fees display immediately after creation with longer delay
          setTimeout(async () => {
            console.log("Attempting to update admin fees display...");
            const feesElement = document.getElementById("collectedFees");
            const withdrawBtn = document.getElementById("withdrawFeesBtn");

            console.log("Fees element found:", !!feesElement);
            console.log("Withdraw button found:", !!withdrawBtn);

            if (feesElement) {
              console.log("Updating fees element with:", collectedFees, "ETH");
              feesElement.innerText = `${collectedFees} ETH`;
              console.log("Fees element updated to:", feesElement.innerText);
            } else {
              console.error("Fees element still not found after 1000ms delay");
            }

            if (withdrawBtn) {
              const newButtonText = `Withdraw Fees (${collectedFees} ETH)`;
              console.log("Updating withdraw button to:", newButtonText);
              withdrawBtn.innerText = newButtonText;
            } else {
              console.error("Withdraw button not found");
            }
          }, 1000);

          // Set up periodic fee updates every 20 seconds (less frequent to avoid rate limits)
          setInterval(async () => {
            await updateAdminFeesDisplay();
          }, 20000);
        }
      } else {
        // Make sure admin section is visible
        adminSection.style.display = "block";
        console.log("Admin section already exists, updating fees directly");

        // Update collected fees directly since admin section already exists
        const feesElement = document.getElementById("collectedFees");
        const withdrawBtn = document.getElementById("withdrawFeesBtn");

        if (feesElement) {
          console.log(
            "Updating existing fees element with:",
            collectedFees,
            "ETH"
          );
          feesElement.innerText = `${collectedFees} ETH`;
        } else {
          console.error("Fees element not found in existing admin section");
        }

        if (withdrawBtn) {
          withdrawBtn.innerText = `Withdraw Fees (${collectedFees} ETH)`;
        }

        // Ensure event listeners are attached to existing buttons
        const checkDrawBtn = document.getElementById("checkDrawBtn");
        const requestDrawBtn = document.getElementById("requestDrawBtn");
        const selectNewWinnerBtn =
          document.getElementById("selectNewWinnerBtn");
        const refreshFeesBtn = document.getElementById("refreshFeesBtn");

        // Remove existing listeners and add new ones
        if (checkDrawBtn && !checkDrawBtn.hasAttribute("data-listener-added")) {
          checkDrawBtn.addEventListener("click", async () => {
            console.log("Check Draw button clicked");
            await checkCanDraw();
          });
          checkDrawBtn.setAttribute("data-listener-added", "true");
        }

        if (
          requestDrawBtn &&
          !requestDrawBtn.hasAttribute("data-listener-added")
        ) {
          requestDrawBtn.addEventListener("click", async () => {
            console.log("Request Draw button clicked");
            await requestDraw();
          });
          requestDrawBtn.setAttribute("data-listener-added", "true");
        }

        if (
          selectNewWinnerBtn &&
          !selectNewWinnerBtn.hasAttribute("data-listener-added")
        ) {
          selectNewWinnerBtn.addEventListener("click", async () => {
            console.log("Select New Winner button clicked");
            await selectNewWinner();
          });
          selectNewWinnerBtn.setAttribute("data-listener-added", "true");
        }

        if (withdrawBtn && !withdrawBtn.hasAttribute("data-listener-added")) {
          withdrawBtn.addEventListener("click", async () => {
            console.log("Withdraw Fees button clicked");
            await withdrawFees();
          });
          withdrawBtn.setAttribute("data-listener-added", "true");
        }

        if (
          refreshFeesBtn &&
          !refreshFeesBtn.hasAttribute("data-listener-added")
        ) {
          refreshFeesBtn.addEventListener("click", async () => {
            console.log("Refresh Fees button clicked");
            await updateAdminFeesDisplay();
          });
          refreshFeesBtn.setAttribute("data-listener-added", "true");
        }

        console.log("Event listeners attached to existing admin buttons");

        // Check if draw is possible
        await checkCanDraw();
      }
    }

    // Check if user is winner
    const winner = await contract.winner();
    if (winner.toLowerCase() === userAccount.toLowerCase()) {
      // Show winner section
      const winnerSection = document.getElementById("winnerSection");
      if (!winnerSection) {
        const dashboard = document.getElementById("userDashboard");
        if (dashboard) {
          const winnerDiv = document.createElement("div");
          winnerDiv.id = "winnerSection";
          winnerDiv.className = "winner-section";
          winnerDiv.innerHTML = `
            <h3>🎉 Congratulations! You won the jackpot! 🎉</h3>
            <button onclick="window.withdrawWinnings()">Claim Jackpot</button>
          `;
          dashboard.after(winnerDiv);
        }
      }
    }
  } catch (e) {
    console.error("Check winner error:", e);
  }
}

// Check if already connected
export async function checkIfConnected() {
  console.log("Checking if already connected...");
  if (!window.ethereum) return false;

  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    console.log("Current accounts:", accounts);

    if (accounts.length > 0) {
      console.log("Found connected account:", accounts[0]);
      const result = await initWeb3();

      // Refresh data when wallet connects
      if (window.refreshData) {
        window.refreshData();
      }

      return result;
    }

    // Not connected, make sure connect button is visible and deposit button is hidden
    const connectBtn = document.getElementById("connectBtn");
    const depositBtn = document.getElementById("depositBtn");

    if (connectBtn) {
      connectBtn.style.display = "inline-block";
    }

    if (depositBtn) {
      depositBtn.style.display = "none";
    }

    return false;
  } catch (e) {
    console.error("Check connection error:", e);
    return false;
  }
}

// Helper function to shorten address
function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Check if user is admin
async function isAdmin(address) {
  try {
    const owner = await contract.owner();
    return owner.toLowerCase() === address.toLowerCase();
  } catch (e) {
    console.error("Admin check error:", e);
    return false;
  }
}

// Update user dashboard
async function updateUserDashboard() {
  const userAccount = getUserAccount();
  if (!userAccount) return;

  try {
    // Initialize contract if not already done
    if (!contract) {
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      contract = new ethers.Contract(contractAddress, abi, signer);
    }

    // Get user deposit
    const deposit = await contract.userDeposits(userAccount);

    // Calculate win chance
    const totalPool = await contract.totalPool();

    let winChanceDisplay = "0%";
    if (totalPool > 0 && deposit > 0) {
      const winChance = (deposit * 100n) / totalPool;
      winChanceDisplay = `${winChance.toString()}%`;
    }

    // Update user dashboard
    document.getElementById("userAddress").innerText =
      shortenAddress(userAccount);
    document.getElementById("userDeposit").innerText =
      ethers.formatEther(deposit);
    document.getElementById("winChance").innerText = winChanceDisplay;

    // Show user dashboard
    document.getElementById("userDashboard").style.display = "block";
  } catch (e) {
    console.error("Error updating user dashboard:", e);
  }
}

// Connect wallet
export async function connectWallet() {
  console.log("Connect wallet called");
  try {
    if (!window.ethereum) {
      document.getElementById("status").innerText =
        "⚠️ Please install MetaMask.";
      return false;
    }

    document.getElementById("status").innerText = "⏳ Connecting wallet...";

    // Check if already connected first
    const existingAccounts = await window.ethereum.request({
      method: "eth_accounts",
    });

    let accounts;
    if (existingAccounts.length > 0) {
      // Already connected, use existing accounts
      accounts = existingAccounts;
      console.log("Using existing connection:", accounts);
    } else {
      // Request new connection
      accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
    }

    if (accounts.length === 0) {
      document.getElementById("status").innerText = "⚠️ No accounts found.";
      return false;
    }

    // Initialize Web3
    return await initWeb3();
  } catch (e) {
    console.error("Connection error:", e);

    // Handle the specific "already pending" error more gracefully
    if (e.message.includes("already pending")) {
      document.getElementById("status").innerText =
        "⏳ Connection request pending. Please check MetaMask.";

      // Try to proceed with existing connection if available
      try {
        const existingAccounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (existingAccounts.length > 0) {
          return await initWeb3();
        }
      } catch (retryError) {
        console.error("Retry error:", retryError);
      }
    } else {
      document.getElementById("status").innerText =
        "⚠️ Connection failed: " + e.message;
    }
    return false;
  }
}

// Make connectWallet available globally
window.connectWallet = connectWallet;

// Add function to withdraw fees
export async function withdrawFees() {
  try {
    document.getElementById("status").innerText = "⏳ Withdrawing fees...";
    const tx = await contract.withdrawFees();
    await tx.wait();
    document.getElementById("status").innerText =
      "✅ Fees withdrawn successfully!";
  } catch (e) {
    console.error("Withdraw fees error:", e);
    document.getElementById("status").innerText =
      "⚠️ Withdraw fees failed: " + e.message;
  }
}

// Add function to select new winner
export async function selectNewWinner() {
  try {
    document.getElementById("status").innerText = "⏳ Selecting new winner...";
    const tx = await contract.selectNewWinner();
    await tx.wait();
    document.getElementById("status").innerText =
      "✅ New winner selection initiated!";
  } catch (e) {
    console.error("Select new winner error:", e);
    document.getElementById("status").innerText =
      "⚠️ Select new winner failed: " + e.message;
  }
}

// Check if winner selection expired
export async function checkExpiredWinner() {
  try {
    const winner = await contract.winner();
    if (winner === "0x0000000000000000000000000000000000000000") {
      document.getElementById("status").innerText = "No winner selected yet";
      return;
    }

    const winnerSelectedAt = await contract.winnerSelectedAt();
    const claimPeriod = await contract.WINNER_CLAIM_PERIOD();
    const currentTime = Math.floor(Date.now() / 1000);

    if (
      winnerSelectedAt > 0 &&
      currentTime > Number(winnerSelectedAt) + Number(claimPeriod)
    ) {
      document.getElementById("status").innerText =
        "⏳ Checking expired winner...";
      const tx = await contract.selectNewWinner();
      await tx.wait();
      document.getElementById("status").innerText =
        "✅ Winner expired, new selection triggered!";
      updateUI();
    } else {
      const timeLeft =
        Number(winnerSelectedAt) + Number(claimPeriod) - currentTime;
      document.getElementById("status").innerText = `Winner has ${Math.floor(
        timeLeft / 3600
      )} hours and ${Math.floor((timeLeft % 3600) / 60)} minutes left to claim`;
    }
  } catch (e) {
    console.error("Check expired winner error:", e);
    document.getElementById("status").innerText =
      "⚠️ Check failed: " + e.message;
  }
}

// Set up account change listeners
export function setupAccountChangeListeners() {
  if (!window.ethereum) return;

  // Handle account changes
  window.ethereum.on("accountsChanged", (accounts) => {
    console.log("Accounts changed:", accounts);
    if (accounts.length === 0) {
      // User disconnected
      document.getElementById("status").innerText = "Wallet disconnected";
      document.getElementById("userDashboard").style.display = "none";

      // Show connect button and hide deposit button
      const connectBtn = document.getElementById("connectBtn");
      const depositBtn = document.getElementById("depositBtn");

      if (connectBtn) {
        connectBtn.style.display = "inline-block";
        connectBtn.innerText = "🔌 Connect Wallet";
      }

      if (depositBtn) {
        depositBtn.style.display = "none";
      }

      // Hide admin section if visible
      const adminSection = document.getElementById("adminSection");
      if (adminSection) {
        adminSection.style.display = "none";
      }

      userAccount = null;
      contract = null;
      provider = null;
      signer = null;
    } else {
      // Account changed, reinitialize
      initWeb3();
    }
  });

  // Handle chain changes
  window.ethereum.on("chainChanged", (chainId) => {
    console.log("Chain changed:", chainId);
    // Reload the page on chain change
    window.location.reload();
  });
}

// Debug wallet connection with more detailed logging
export function debugWalletConnection() {
  console.log("=== WALLET CONNECTION DEBUGGING ===");
  console.log("window.ethereum exists:", !!window.ethereum);

  if (window.ethereum) {
    console.log("Provider:", provider);
    console.log("Signer:", signer);
    console.log("User account:", userAccount);
    console.log("Contract:", contract);
    console.log("Contract address:", contractAddress);

    // Check if we're on Sepolia
    window.ethereum
      .request({ method: "eth_chainId" })
      .then((chainId) => {
        console.log("Current chain ID:", chainId);
        console.log("Is Sepolia:", chainId === "0xaa36a7");

        // Check accounts
        return window.ethereum.request({ method: "eth_accounts" });
      })
      .then((accounts) => {
        console.log("Current accounts:", accounts);
        if (accounts.length === 0) {
          console.log("No accounts connected. Try requesting accounts...");
          return window.ethereum
            .request({ method: "eth_requestAccounts" })
            .then((requestedAccounts) => {
              console.log("Requested accounts:", requestedAccounts);
            })
            .catch((err) => {
              console.error("Error requesting accounts:", err);
            });
        }
      })
      .catch((err) => {
        console.error("Error in wallet debugging:", err);
      });
  } else {
    console.error("MetaMask not installed or not accessible");
    // Check if running in iframe which might block MetaMask
    if (window !== window.top) {
      console.error("Running in iframe - MetaMask might be blocked");
    }
  }
}

// Make debugWalletConnection available globally
window.debugWalletConnection = debugWalletConnection;

// Helper function for confetti effect
function triggerConfetti() {
  if (typeof confetti === "function") {
    // Multiple bursts for more excitement
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Left side
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
      );

      // Right side
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      );
    }, 250);
  } else {
    console.warn("Confetti library not loaded");
  }
}

// Add function to set fee
export async function setFee() {
  try {
    const feeInput = document.getElementById("feeInput");
    if (!feeInput) {
      document.getElementById("status").innerText = "⚠️ Fee input not found";
      return;
    }

    const feePercent = parseInt(feeInput.value);
    if (isNaN(feePercent) || feePercent < 0 || feePercent > 10) {
      document.getElementById("status").innerText = "⚠️ Invalid fee (0-10%)";
      return;
    }

    document.getElementById("status").innerText = "⏳ Setting fee...";
    const tx = await contract.setFeePercent(feePercent);

    document.getElementById("status").innerText =
      "⏳ Confirming transaction...";
    await tx.wait();

    document.getElementById(
      "status"
    ).innerText = `✅ Fee set to ${feePercent}%`;
  } catch (e) {
    console.error("Set fee error:", e);
    document.getElementById("status").innerText =
      "⚠️ Failed to set fee: " + e.message;
  }
}

// Add admin section to check if draw is possible
export async function checkCanDraw() {
  try {
    const canDraw = await contract.canDraw();
    const adminStatus = document.getElementById("adminStatus");
    if (adminStatus) {
      if (canDraw) {
        adminStatus.innerText = "✅ Draw is possible now!";
        adminStatus.className = "status-ready";
      } else {
        adminStatus.innerText = "⏳ Draw conditions not met yet";
        adminStatus.className = "status-waiting";
      }
    }
    return canDraw;
  } catch (e) {
    console.error("Check draw error:", e);
    return false;
  }
}

// Make admin functions available globally (use the exported functions)
window.checkCanDraw = checkCanDraw;
window.withdrawFees = withdrawFees;
window.selectNewWinner = selectNewWinner;
window.requestDraw = requestDraw;

// Add this function to check collected fees
export async function checkCollectedFees() {
  if (!contract) return "0";

  try {
    const collectedFees = await contract.collectedFees();
    return ethers.formatEther(collectedFees);
  } catch (e) {
    console.error("Error checking collected fees:", e);
    return "0";
  }
}

// Function to update admin fees display
export async function updateAdminFeesDisplay() {
  const collectedFeesElement = document.getElementById("collectedFees");
  const withdrawFeesBtn = document.getElementById("withdrawFeesBtn");

  console.log("updateAdminFeesDisplay called");
  console.log("collectedFeesElement found:", !!collectedFeesElement);
  console.log("contract exists:", !!contract);

  if (!collectedFeesElement) {
    console.error("collectedFees element not found in DOM");
    return "0";
  }

  if (!contract) {
    console.error("Contract not initialized");
    collectedFeesElement.innerText = "Contract not connected";
    return "0";
  }

  try {
    console.log("Fetching fees from contract...");
    const feesWei = await contract.collectedFees();
    console.log("Fees in Wei:", feesWei.toString());

    const collectedFees = ethers.formatEther(feesWei);
    console.log("Formatted fees:", collectedFees, "ETH");

    // Update the display
    collectedFeesElement.innerText = `${collectedFees} ETH`;
    console.log(
      "Updated collectedFees element text to:",
      collectedFeesElement.innerText
    );

    // Update the withdraw button
    if (withdrawFeesBtn) {
      withdrawFeesBtn.innerText = `Withdraw Fees (${collectedFees} ETH)`;
      console.log("Updated withdraw button text");
    } else {
      console.warn("withdrawFeesBtn not found");
    }

    return collectedFees;
  } catch (error) {
    console.error("Error updating admin fees display:", error);
    collectedFeesElement.innerText = "Error loading fees";
    return "0";
  }
}

// Make updateAdminFeesDisplay available globally
window.updateAdminFeesDisplay = updateAdminFeesDisplay;

// Add a test function to verify admin functions work
window.testAdminFunctions = function () {
  console.log("Testing admin functions...");
  console.log("checkCanDraw:", typeof window.checkCanDraw);
  console.log("withdrawFees:", typeof window.withdrawFees);
  console.log("selectNewWinner:", typeof window.selectNewWinner);
  console.log("requestDraw:", typeof window.requestDraw);
  console.log("updateAdminFeesDisplay:", typeof window.updateAdminFeesDisplay);

  // Test if admin elements exist
  const adminSection = document.getElementById("adminSection");
  const feesElement = document.getElementById("collectedFees");
  const withdrawBtn = document.getElementById("withdrawFeesBtn");

  console.log("Admin section exists:", !!adminSection);
  console.log("Fees element exists:", !!feesElement);
  console.log("Withdraw button exists:", !!withdrawBtn);

  if (feesElement) {
    console.log("Current fees display:", feesElement.innerText);
  }
};

// Admin functions are already exported above, just make them globally available

window.setFee = async function () {
  try {
    const feeInput = document.getElementById("feeInput");
    const feePercent = parseInt(feeInput.value);

    if (isNaN(feePercent) || feePercent < 0 || feePercent > 10) {
      document.getElementById("status").innerText =
        "⚠️ Fee must be between 0-10%";
      return;
    }

    document.getElementById("status").innerText = "⏳ Setting fee...";
    const tx = await contract.setFeePercent(feePercent);
    await tx.wait();
    document.getElementById(
      "status"
    ).innerText = `✅ Fee set to ${feePercent}%`;
  } catch (e) {
    console.error("Set fee error:", e);
    document.getElementById("status").innerText =
      "⚠️ Failed to set fee: " + e.message;
  }
};

// Make withdrawal functions available globally
window.withdrawWinnings = withdrawWinnings;
window.withdraw = withdraw;

// Initialize the page
export async function initPage() {
  try {
    // Check if MetaMask is installed
    if (window.ethereum) {
      // Set up event listeners
      const connectBtn = document.getElementById("connectBtn");
      if (connectBtn) {
        connectBtn.addEventListener("click", connectWallet);
      }

      const depositBtn = document.getElementById("depositBtn");
      if (depositBtn) {
        // Remove any existing event listeners first
        depositBtn.replaceWith(depositBtn.cloneNode(true));
        const newDepositBtn = document.getElementById("depositBtn");

        newDepositBtn.addEventListener("click", function () {
          console.log("Deposit button clicked - single handler");
          connectAndDeposit();
        });
      }

      // Make connectAndDeposit available globally
      window.connectAndDeposit = connectAndDeposit;

      // Add event listener for withdrawal button
      const withdrawFundsBtn = document.getElementById("withdrawFundsBtn");
      if (withdrawFundsBtn) {
        withdrawFundsBtn.addEventListener("click", async function () {
          console.log("Withdraw Funds button clicked");
          const withdrawAmountInput = document.getElementById("withdrawAmount");
          let amount = null;

          if (withdrawAmountInput && withdrawAmountInput.value) {
            amount = ethers.parseEther(withdrawAmountInput.value);
          }

          await withdraw(amount);
        });
      }

      // Set up account change listeners
      setupAccountChangeListeners();

      // Check if already connected using the proper function
      await checkIfConnected();
    } else {
      document.getElementById("status").innerText =
        "⚠️ MetaMask not detected. Please install MetaMask to use this app.";
    }
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// Call initPage when the DOM is loaded
document.addEventListener("DOMContentLoaded", initPage);
