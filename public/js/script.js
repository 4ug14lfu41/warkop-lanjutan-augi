// toggle class active
const navbarNav = document.querySelector(".navbar-nav");
// ketika hamburger menu klik 
document.querySelector("#hamburger-menu"). onclick = () => {
    navbarNav.classList.toggle("active");
} ;

// klik di luar sidebar untuk menghilangkan nav
const hamburger = document.querySelector("#hamburger-menu");
document.addEventListener("click", function (e){
    if(!hamburger.contains(e.target)&& !navbarNav.contains(e.target)){
        navbarNav.classList.remove("active");
}
});


function notifyLogin() {
    alert("Silakan login terlebih dahulu untuk menambah ke keranjang atau membeli produk.");
}

function addToCart(menuId) {
    let quantity = document.getElementById(`quantity-${menuId}`).value;
    // Implementasikan logika penambahan ke keranjang disini
    alert(`Berhasil menambahkan ${quantity} produk ke keranjang.`);
}

function buyNow(menuId) {
    let quantity = document.getElementById(`quantity-${menuId}`).value;
    // Implementasikan logika pembelian disini
    alert(`Berhasil membeli ${quantity} produk.`);
}

function increaseQuantity(menuId) {
    let quantityInput = document.getElementById(`quantity-${menuId}`);
    quantityInput.value = parseInt(quantityInput.value) + 1;
}

function decreaseQuantity(menuId) {
    let quantityInput = document.getElementById(`quantity-${menuId}`);
    if (parseInt(quantityInput.value) > 1) {
        quantityInput.value = parseInt(quantityInput.value) - 1;
    }
}

