// @ts-nocheck
import AppIcon from "../MultiuseComponents/AppIcon"
import UserPicture from "../MultiuseComponents/UserPicture"

function NavBar() {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    return (
        <nav className="flex items-center justify-between p-3 h-18 w-screen">
            <AppIcon />
            <div className="flex items-center gap-2.5">
                <UserPicture avatar={user?.avatar} username={user?.username} size={38} />
            </div>
        </nav>
    )
}

export default NavBar
