'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, Divider } from '@mui/material';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import InsightsIcon from '@mui/icons-material/Insights';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import StorageIcon from '@mui/icons-material/Storage';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import HistoryIcon from '@mui/icons-material/History';
import PaletteIcon from '@mui/icons-material/Palette';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { useState } from 'react';
import AppearanceSettingsDialog from '@/src/components/board/appearanceSettingsDialog';
import Image from 'next/image';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_COLLAPSED = 64;
const NAV_EXPANDED = 220;

export const getNavWidth = (collapsed: boolean) => (collapsed ? NAV_COLLAPSED : NAV_EXPANDED);

export default function SideNav({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const w = getNavWidth(collapsed);
  const [openAppearance, setOpenAppearance] = useState(false);

  const Item = (
    { href, icon, label }:
    { href: string; icon: React.ReactNode; label: string }
  ) => {
    const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
    return (
      <ListItemButton
        component={Link}
        href={href}
        selected={!!active}
        sx={{
          borderRadius: 2,
          mx: 1,
          my: 0.5,
          '&.Mui-selected': { bgcolor: 'primary.main', color: 'black', '&:hover': { bgcolor: 'primary.main' } },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{icon}</ListItemIcon>
        {!collapsed && <ListItemText primary={label} />}
      </ListItemButton>
    );
  };

  return (
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: w,
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1100,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image src="/logo.png" alt="Chess Analyzer" width={28} height={28} />
        </Link>
        {!collapsed && <Box sx={{ fontWeight: 700 }}>Chess Analyzer</Box>}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={collapsed ? 'Expand' : 'Collapse'}>
          <IconButton size="small" onClick={onToggle} aria-label="toggle sidenav">
            {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />
      <List dense sx={{ py: 0.5 }}>
        <Item href="/" icon={<HomeIcon />} label="Home" />
        <Item href="/analyze" icon={<InsightsIcon />} label="Analyze" />
        <Item href="/explore" icon={<TravelExploreIcon />} label="Explore" />
        <Item href="/games" icon={<LibraryBooksIcon />} label="Games" />
        <Item href="/play" icon={<SportsEsportsIcon />} label="Play" />
        <Item href="/records" icon={<StorageIcon />} label="Records" />
        <Item href="/updates" icon={<HistoryIcon />} label="Updates" />
        <Item href="/contact" icon={<MailOutlineIcon />} label="Contact" />
        <ListItemButton
          onClick={() => setOpenAppearance(true)}
          sx={{
            borderRadius: 2,
            mx: 1,
            my: 0.5,
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}><PaletteIcon /></ListItemIcon>
          {!collapsed && <ListItemText primary="Appearance" />}
        </ListItemButton>
      </List>
      <Box sx={{ flex: 1 }} />
      <AppearanceSettingsDialog open={openAppearance} onClose={() => setOpenAppearance(false)} />
    </Box>
  );
}
