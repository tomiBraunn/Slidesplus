import AppIcon from "../MultiuseComponents/AppIcon"
import Settings from "../MultiuseComponents/Settings"
import UserPicture from "../MultiuseComponents/UserPicture"

function NavBar() {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    return (
        <nav className="flex items-center justify-between p-3 h-20 w-screen">
            <AppIcon />
            <div className="flex items-center gap-2.5">
                {/* <Settings /> */}
                <UserPicture avatar={user?.avatar} username={user?.username} size={50} />
            </div>
        </nav>
    )
}

export default NavBar
