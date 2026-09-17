export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-gray-500 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <h3 className="mb-3 font-semibold text-gray-900">Abyte</h3>
            <p>Your everyday online store.</p>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-gray-900">Shop</h3>
            <ul className="space-y-2">
              <li>All products</li>
              <li>New arrivals</li>
              <li>Deals</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-gray-900">Support</h3>
            <ul className="space-y-2">
              <li>Order tracking</li>
              <li>Returns</li>
              <li>Contact us</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-gray-900">Company</h3>
            <ul className="space-y-2">
              <li>About</li>
              <li>Careers</li>
              <li>Privacy policy</li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-gray-100 pt-6">© {new Date().getFullYear()} Abyte. All rights reserved.</p>
      </div>
    </footer>
  );
}
