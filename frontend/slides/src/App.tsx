import ProjectTile from './components/ProjectTile';
import AppTextLogo from './components/AppTextLogo';
import ProjectSearchBar from './components/ProjectSearchBar';
import NavBar from './components/NavBar';

function App() {
  return (
    <>
      <NavBar />
      <main className='flex flex-col items-center justify-start h-screen text-white'>
        <AppTextLogo />
        <ProjectSearchBar />
        {/* <ProjectTile /> */}
      </main>
    </>
  );
}

export default App;
