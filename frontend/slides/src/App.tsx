import AppIcon from './components/AppIcon';
import ProjectTile from './components/ProjectTile';
import AppTextLogo from './components/AppTextLogo';
import ProjectSearchBar from './components/ProjectSearchBar';

function App() {
  return (
    <>
      <nav><AppIcon /></nav>
      <main className='flex flex-col items-center justify-start h-screen text-white'>
        <AppTextLogo />
        <ProjectSearchBar />
        {/* <ProjectTile /> */}
      </main>
    </>
  );
}

export default App;