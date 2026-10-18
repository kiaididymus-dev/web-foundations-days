const API_URL = "https://jsonplaceholder.typicode.com/users";

const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusEl = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let allUsers = [];

// Fetch users from the API
async function loadUsers() {
  statusEl.textContent = "Loading users...";
  loadButton.disabled = true;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }
    allUsers = await response.json();
    applyFilter();
    statusEl.textContent = `Loaded ${allUsers.length} users.`;
  } catch (error) {
    statusEl.textContent = `Error: could not load users. ${error.message}`;
  } finally {
    loadButton.disabled = false;
  }
}

// Draw any array of users
function renderUsers(list) {
  usersList.replaceChildren();

  if (allUsers.length > 0 && list.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No users match your filter.";
    usersList.appendChild(empty);
    return;
  }

  list.forEach((user) => {
    const item = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const details = document.createElement("div");
    details.textContent = `${user.email} | ${user.address.city} | ${user.company.name}`;

    item.append(name, details);
    usersList.appendChild(item);
  });
}

// Filter the stored array (no new request)
function applyFilter() {
  const term = filterInput.value.trim().toLowerCase();
  const matches = allUsers.filter((user) => user.name.toLowerCase().includes(term));
  renderUsers(matches);
}

loadButton.addEventListener("click", loadUsers);
filterInput.addEventListener("input", applyFilter);