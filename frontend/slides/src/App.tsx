import ProjectTile from './components/ProjectTile';
import AppTextLogo from './components/AppTextLogo';
import ProjectSearchBar from './components/ProjectSearchBar';
import NavBar from './components/NavBar';

function App() {
  return (
    <>
      <div className="bg-[#121212] w-screen h-screen flex items-center justify-start flex-col gap-5">
        <div className='flex flex-col items-center justify-start'>
          <NavBar />
          <div className='flex flex-col items-center justify-start text-white w-[60vw]'>
            <div className='searchbar flex flex-col items-center justify-start w-full'>
              <AppTextLogo />
              <ProjectSearchBar />
            </div>
          </div>
        </div>
        <main className="flex justify-center w-full">
          <div className="flex flex-wrap justify-start w-[60vw] gap-4">
            <ProjectTile />
            <ProjectTile />
            <ProjectTile />
          </div>
        </main>

      </div>
    </>
  );
}

export default App;